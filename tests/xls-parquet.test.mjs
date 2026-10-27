// Teste 8.2.0: import .xls (BIFF8, Excel 97-2003) și .parquet, citite fără biblioteci.
// Fișierele din tests/fixtures au fost generate o singură dată cu instrumente externe (NU cu codul aplicației), ca să nu verificăm cititorul cu propriul scriitor:
//   *.xls     — openpyxl (.xlsx) convertit cu LibreOffice 'MS Excel 97' (book.xls: text unicode, formule, date, booleeni, foaie 2; big.xls: 600 de șiruri → SST cu CONTINUE)
//   *.parquet — pyarrow 26 (plain/dict/snappy/gzip/zstd, pagini v1 și v2; big_snappy: 6000 de rânduri, 3 grupuri de rânduri)
// NU au fost testate fișiere reale din Excel/Spark/DuckDB; fișierul „criptat” și cel BIFF5 sunt simulate prin modificarea unui octet (doar detecția).
// Rulare: node tests/xls-parquet.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require = createRequire(process.env.PW_ROOT || import.meta.url);
const {chromium} = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = 'file://' + path.resolve(here, '..', 'index.html'), FX = path.join(here, 'fixtures');
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});
const ctx = await b.newContext({viewport: {width: 1300, height: 1000}, locale: 'ro-RO'});
const net = []; await ctx.route(/^https?:/, (r) => { net.push(r.request().url()); r.abort(); });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(FILE); await page.waitForTimeout(500);
const conv = (name, buf) => page.evaluate(async ([name, b64]) => {
  const u = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  try { const r = await (/\.xls$/.test(name) ? xlsToCsv : parquetToCsv)(u.buffer); return {csv: r.csv, sheet: r.sheet, count: r.count, pq: r.pq}; } catch (e) { return {err: String(e.message)}; }
}, [name, (buf || fs.readFileSync(path.join(FX, name))).toString('base64')]);

/* ---------- .xls ---------- */
let r = await conv('book.xls');
const L = (r.csv || '').split('\n');
check('xls: antet', L[0] === 'nume,varsta,scor,data,activ,formula,note', L[0]);
check('xls: text unicode, număr, dată ISO, boolean, formulă în cache', L[1] === 'Ana,31,8.5,2024-03-15,TRUE,62,ăâîșț ✓', L[1]);
check('xls: virgulă și ghilimele între ghilimele CSV', L[2] === 'Bogdan,45,7.25,2023-12-01,FALSE,90,"cu, virgulă"' && L[3] === 'Cătălina,28,9,2025-01-31,TRUE,56,"ghilimele ""x"""', [L[2], L[3]]);
check('xls: celule goale păstrate', L[4] === 'Dan,,6.5,,,,gol', L[4]);
check('xls: 14 rânduri de date, toate cu 7 coloane', L.length === 15 && L.every((l) => !l.includes('"') ? l.split(',').length === 7 : true), L.length);
check('xls: șiruri lungi (200 de caractere) și date calculate din zile', L[5].startsWith('r0x') && L[5].endsWith(',0,0,2024-01-01,TRUE,,s0') && L[14].endsWith(',9,0.9,2024-01-10,TRUE,,s9'), [L[5].slice(-30), L[14].slice(-30)]);
check('xls: prima foaie și numărul de foi', r.sheet === 'Date' && r.count === 2, [r.sheet, r.count]);
r = await conv('big.xls');
const B = (r.csv || '').split('\n'); let bigOk = B.length === 601 && B[0] === 'id,text';
for (let i = 0; i < 600 && bigOk; i++) if (B[i + 1] !== i + ',șir lung numărul ' + i + ' ' + 'é'.repeat(30)) { bigOk = false; check('xls: SST mare, rândul ' + i, false, B[i + 1]); }
check('xls: 600 de șiruri (SST întins pe mai multe înregistrări CONTINUE) citite exact', bigOk, B.length);
// simulări (doar detecția): FILEPASS și BIFF5
const bk = fs.readFileSync(path.join(FX, 'book.xls'));
const pos = bk.findIndex((_, i) => bk[i] === 0xE1 && bk[i + 1] === 0 && bk[i + 2] === 2 && bk[i + 3] === 0 && i > 512);
check('xls: găsit un record INTERFACEHDR de înlocuit (pregătire test)', pos > 0, pos);
const enc = Buffer.from(bk); enc[pos] = 0x2F; r = await conv('enc.xls', enc);
check('xls: record FILEPASS (criptat) → eroare dedicată', r.err === 'xls-enc', r);
const v5 = Buffer.from(bk); const bof = v5.findIndex((_, i) => i > 512 && v5[i] === 0x09 && v5[i + 1] === 0x08 && v5[i + 2] === 0x10 && v5[i + 3] === 0);
v5[bof + 4] = 0x00; v5[bof + 5] = 0x05; r = await conv('v5.xls', v5);
check('xls: BOF cu versiune BIFF5 → eroare dedicată', r.err === 'xls-ver', [bof, r]);
check('xls: fișier fals → eroare', (await conv('x.xls', Buffer.from('nu este un container OLE2, deloc'))).err === 'cfb');
check('xls: truncat → eroare, nu blocaj', !!(await conv('t.xls', bk.subarray(0, 3000))).err);

/* ---------- parquet ---------- */
const EXP = ['id,nume,scor,f32,activ,data,ts,dec,i32', '1,Ana,8.5,0.1,true,2024-03-15,2024-03-15 10:30:05,12.34,1', '2,Bogdan,7.25,0.3,false,2023-12-01,,-0.05,-2', '3,,,2.5,,,2020-01-01 00:00:00.123,,3', ',Dăniță ✓,9,,true,2025-01-31,1999-12-31 23:59:59,1000.00,4'].join('\n');
for (const n of ['t_plain', 't_dict', 't_snappy', 't_gzip', 't_v2', 't_v2snappy']) {
  r = await conv(n + '.parquet');
  check('parquet ' + n + ': conținut identic (int64/32, text, double, float32, bool, dată, timestamp ms, decimal, nuluri)', r.csv === EXP && r.pq && r.pq.rows === 4 && r.pq.cols === 9, r.err || r.csv);
}
r = await conv('big_snappy.parquet'); const Q = (r.csv || '').split('\n');
check('parquet: 6000 de rânduri din 3 grupuri, snappy + dicționar + nuluri', Q.length === 6001 && Q[0] === 'k,cat,v' && Q[1] === '0,b,0.122311' && Q[6000] === '5999,a,0.695391' && r.pq.rows === 6000, [Q.length, Q[1], Q[6000], r.err]);
check('parquet: 604 valori nule (verificat cu pyarrow)', Q.slice(1).filter((l) => l.endsWith(',')).length === 604);
check('parquet: ZSTD → mesaj dedicat cu numele codecului', (await conv('t_zstd.parquet')).err === 'pq-codec:ZSTD');
check('parquet: coloane imbricate → mesaj dedicat', (await conv('nested.parquet')).err === 'pq-nested');
const pqb = fs.readFileSync(path.join(FX, 't_plain.parquet'));
check('parquet: fișier trunchiat/fals → eroare, nu blocaj', !!(await conv('a.parquet', pqb.subarray(0, 500))).err && !!(await conv('b.parquet', Buffer.from('PAR1xxxxxxxxxxxxxxPAR1'))).err);
const bf = Buffer.from(pqb); bf[Math.floor(bf.length / 2)] ^= 0xFF; bf[40] ^= 0x55;
const rc = await conv('c.parquet', bf); check('parquet: octeți stricați → fără excepție necontrolată', rc.err !== undefined || typeof rc.csv === 'string');

/* ---------- integrare în aplicație (ca utilizatorul) ---------- */
const toastText = () => page.$eval('#toast', (e) => e.textContent);
await page.setInputFiles('#fileInput', path.join(FX, 'book.xls')); await page.waitForTimeout(900);
let st = await page.evaluate(() => ({cols: state.columns.map((c) => c.name), raw: state.raw, file: state.fileName, types: state.columns.map((c) => c.type)}));
check('app: .xls încărcat, nume book.csv, 7 coloane', st.file === 'book.csv' && st.cols.join('|') === 'nume|varsta|scor|data|activ|formula|note', [st.file, st.cols]);
check('app: tip număr inferat pentru scor', st.types[2] === 'number', st.types);
check('app: mesaj cu numele foii', /Date/.test(await toastText()), await toastText());
await page.setInputFiles('#fileInput', path.join(FX, 't_snappy.parquet')); await page.waitForTimeout(900);
st = await page.evaluate(() => ({cols: state.columns.map((c) => c.name), raw: state.raw, file: state.fileName}));
check('app: .parquet încărcat, nume t_snappy.csv, 9 coloane, 4 rânduri', st.file === 't_snappy.csv' && st.cols.length === 9 && st.raw.length === 4, [st.file, st.cols.length, st.raw.length]);
check('app: mesaj „Parquet: 4 rânduri, 9 coloane”', /Parquet: 4 rânduri, 9 coloane/.test(await toastText()), await toastText());
await page.setInputFiles('#fileInput', path.join(FX, 't_zstd.parquet')); await page.waitForTimeout(600);
check('app: Parquet ZSTD → mesaj clar, datele anterioare rămân', /ZSTD/.test(await toastText()) && /CSV/.test(await toastText()) && await page.evaluate(() => state.columns.length) === 9, await toastText());
await page.setInputFiles('#fileInput', path.join(FX, 'nested.parquet')); await page.waitForTimeout(600);
check('app: Parquet imbricat → mesaj clar', /imbricate/.test(await toastText()), await toastText());
fs.writeFileSync('/tmp/enc_dw.xls', enc); await page.setInputFiles('#fileInput', '/tmp/enc_dw.xls'); await page.waitForTimeout(600);
check('app: .xls criptat (simulat) → mesaj despre parolă', /parol/.test(await toastText()), await toastText()); fs.rmSync('/tmp/enc_dw.xls');
await page.setInputFiles('#nbApplyIn', path.join(FX, 't_dict.parquet')); await page.waitForTimeout(900);
check('caiet: „Aplică pe alt fișier” acceptă .parquet', /t_dict\.parquet/.test(await toastText()), await toastText());
check('accept include .xls și .parquet', await page.$eval('#fileInput', (e) => /\.xls\b/.test(e.accept) && /\.parquet/.test(e.accept)) && await page.$eval('#nbApplyIn', (e) => /\.parquet/.test(e.accept)));
// i18n: cheile noi există în toate cele 8 limbi (traducerile fr/it/es/pt/de/hu sunt automate)
const miss = await page.evaluate(() => { const ks = ['xlsErr', 'xlsEnc', 'pqErr', 'pqCodec', 'pqEnc', 'pqNested', 'pqInfo'], out = []; for (const l of ['ro', 'en', 'fr', 'it', 'es', 'pt', 'de', 'hu']) for (const k of ks) if (!I18N[l][k]) out.push(l + '.' + k); return out; });
check('chei i18n noi în 8 limbi', miss.length === 0, miss);
check('fără cereri de rețea', net.length === 0, net);
check('fără erori JS', errs.length === 0, errs);
await b.close();
console.log(`\nDataWeave xls/parquet: ${ok} ok, ${bad} eșuate`); process.exit(bad ? 1 : 0);
