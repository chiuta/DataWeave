// Teste DataWeave pe fișiere .xls / .parquet SINTETICE, produse cu scriitori reali: xlwt 1.3.0, LibreOffice 24.2 (din .xlsx openpyxl 3.1.5), pyarrow 26.0.0, fastparquet 2026.9.0.
// NU sunt produse de Microsoft Excel, Spark, DuckDB sau Hive. Valorile așteptate sunt scrise de mână din datele sursă ale generatoarelor (tests/fixtures/generate_*.py), nu din ieșirea aplicației.
// Rulare: node tests/fixtures-real.test.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require = createRequire(process.env.PW_ROOT || import.meta.url);
const {chromium} = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const FX = path.join(here, 'fixtures');
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const same = (n, a, b) => check(n, JSON.stringify(a) === JSON.stringify(b), [a, b]);
const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});
const ctx = await b.newContext({locale: 'ro-RO'});
const net = []; await ctx.route(/^https?:/, (r) => { net.push(r.request().url()); r.abort(); });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto('file://' + path.resolve(here, '..', 'index.html')); await page.waitForTimeout(500);
const conv = (name) => page.evaluate(async ([name, b64]) => {
  const u = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  try { const r = await (/\.xls$/.test(name) ? xlsToCsv : parquetToCsv)(u.buffer); return {csv: r.csv, sheet: r.sheet, count: r.count, pq: r.pq}; } catch (e) { return {err: String(e.message)}; }
}, [name, fs.readFileSync(path.join(FX, name)).toString('base64')]);
function parse(csv) { // parser CSV independent, cu ghilimele și linii noi în câmp
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < csv.length; i++) { const c = csv[i];
    if (q) { if (c === '"') { if (csv[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; } else f += c; }
  row.push(f); rows.push(row); return rows;
}
const cols = (rows) => Object.fromEntries(rows[0].map((h, j) => [h, rows.slice(1).map((r) => r[j])]));

/* ---------- .xls scris de xlwt ---------- */
let r = await conv('xlwt_mixed.xls'); let T = parse(r.csv || '');
same('xlwt_mixed: foaia 1 (Unicode în nume) și 3 foi', [r.sheet, r.count], ['Mixt ă', 3]);
same('xlwt_mixed: celulă mergiută — valoarea doar în A1, restul goale', T[0], ['Titlu mergiut ăîșț', '', '', '', '']);
same('xlwt_mixed: antet', T[1], ['id', 'valoare', 'text', 'data', 'activ']);
same('xlwt_mixed: întregi RK/limite (1, -5, 2^29-1, 2^30-1, 2^31-1, 0)', T.slice(2, 8).map((x) => x[0]), ['1', '-5', '536870911', '1073741823', '2147483647', '0']);
same('xlwt_mixed: float (RK*100 0.01, 1234567.89, 1e10, -0.5, pi, 1e-7)', T.slice(2, 8).map((x) => x[1]), ['0.01', '1234567.89', '10000000000', '-0.5', '3.141592653589793', '1e-7']);
same('xlwt_mixed: Unicode (diacritice, CJK, emoji), virgulă, ghilimele, linie nouă în câmp', T.slice(2, 8).map((x) => x[2]), ['Ana', 'Dăniță ✓ 日本語', 'cu, virgulă', 'ghilimele "x"', 'linie\nnouă', '😀 emoji']);
same('xlwt_mixed: date (stil dată / dată+oră), inclusiv 1900-03-01 și 29 feb 2024', T.slice(2, 8).map((x) => x[3]), ['2024-03-15', '2023-12-01 08:05:30', '1999-12-31', '2025-01-31', '1900-03-01', '2024-02-29']);
same('xlwt_mixed: booleeni', T.slice(2, 8).map((x) => x[4]), ['TRUE', 'FALSE', 'TRUE', 'FALSE', 'TRUE', 'FALSE']);
check('xlwt_mixed: șir de 300 de caractere intact', T[8][0] === 'x'.repeat(300), T[8][0].length);
same('xlwt_mixed: celulă rară pe un rând aproape gol', T[9], ['', '', 'doar C10', '', '']);
r = await conv('xlwt_hidden_first.xls'); same('xlwt_hidden_first: se citește prima foaie VIZIBILĂ', [r.csv, r.sheet, r.count], ['k\nvizibil', 'Vizibila', 2]);
r = await conv('xlwt_all_empty.xls'); same('xlwt_all_empty: foi goale → eroare „empty”', r.err, 'empty');
r = await conv('xlwt_empty_first.xls'); same('xlwt_empty_first: prima foaie goală → eroare „empty” (limită documentată: nu sare la a doua foaie)', r.err, 'empty');
r = await conv('xlwt_formula_cache_zero.xls'); same('xlwt_formula: xlwt nu calculează formulele (cache „gol”) → celulele formulă sunt goale, valorile rămân', r.csv, '2,3\nx,');
r = await conv('xlwt_3000rows.xls'); T = parse(r.csv || '');
check('xlwt_3000rows: 3001 de rânduri x 6 coloane, SST mare', T.length === 3001 && T.every((x) => x.length === 6), [T.length]);
same('xlwt_3000rows: primul și ultimul rând de date', [T[1], T[3000]], [['t1_0 ă', '2.75', 't1_2 ă', '3.25', 't1_4 ă', '3.75'], ['t3000_0 ă', '7500.25', 't3000_2 ă', '7500.75', 't3000_4 ă', '7501.25']]);
/* ---------- .xls LibreOffice ---------- */
r = await conv('lo_calc.xls'); T = parse(r.csv || '');
same('lo_calc: foaia 1 din 2', [r.sheet, r.count], ['Calcule', 2]);
same('lo_calc: formule cu valori în cache (sumă, text, dată calculată, raport)', [T[1], T[2]], [['2', '3', '5', 'n=2', '2024-05-17', '', '0.6666666666666666'], ['10', '4', '14', 'ĂBC', '2024-06-16', '', '2.5']]);
same('lo_calc: formule cu eroare (#DIV/0!, #NUM!) → celulă goală; celulă mergiută', [T[1][5], T[2][5], T[3]], ['', '', ['mergiut', '', '', '', '', '', '']]);

/* ---------- parquet pyarrow ---------- */
const EXP = {
  i8: ['1', '-2', '', '127', '-128'], i16: ['300', '', '-300', '0', '32767'], i32: ['1', '2', '3', '', '-2147483648'],
  i64: ['1099511627776', '-1099511627776', '', '0', '9007199254740991'], u32: ['0', '4294967295', '1', '', '7'],
  f32: ['0.1', '2.5', '', '-1', '3.4e+38'], f64: ['0.1', '1e+300', '', '0', '3.141592653589793'],
  str: ['Ana', 'Dăniță ✓', '', '', 'a,b"c\nd'], lstr: ['x', 'y', 'z', '', 'ț'], bool: ['true', 'false', '', 'true', 'false'],
  d32: ['2024-03-15', '1970-01-01', '', '1900-01-01', '2999-12-31'],
  ts_ms: ['2024-03-15 10:30:05.123', '', '1970-01-01 00:00:00', '1969-12-31 23:59:59', '2100-01-01 00:00:00'],
  ts_us: ['2024-03-15 10:30:05.123', '', '1970-01-01 00:00:00', '1969-12-31 23:59:59', '2100-01-01 00:00:00'], // microsecundele (.123456) se trunchiază la ms: limită documentată
  ts_utc: ['2024-03-15 10:30:05', '', '1970-01-01 00:00:00', '2000-01-01 00:00:00', '2100-01-01 00:00:00'],
  dec: ['12.34', '-0.05', '', '1000.00', '0.00'], allnull: ['', '', '', '', ''],
};
const typesOk = (t) => Object.keys(EXP).every((k) => JSON.stringify(t[k]) === JSON.stringify(EXP[k]));
for (const n of ['none', 'snappy', 'gzip', 'dict', 'v2']) {
  r = await conv('pa_types_' + n + '.parquet'); T = cols(parse(r.csv || ''));
  check('pyarrow ' + n + ': 17 coloane (int8/16/32/64, uint32, float, double, text, large_string, bool, date, timestamp ms/us/UTC, decimal, doar-null), nuluri', typesOk(T) && r.pq.rows === 5 && r.pq.cols === 17, Object.keys(EXP).filter((k) => JSON.stringify(T[k]) !== JSON.stringify(EXP[k])).map((k) => [k, T[k]]));
}
same('pyarrow: binary decodat ca text (octeți non-UTF-8 → U+FFFD; limită)', cols(parse((await conv('pa_types_none.parquet')).csv)).bin.filter((x, i) => i !== 3), ['abc', '', '', 'z']);
for (const [n, c] of [['zstd', 'pq-codec:ZSTD'], ['lz4', 'pq-codec:LZ4_RAW'], ['brotli', 'pq-codec:BROTLI'], ['delta', 'pq-enc:DELTA_BINARY_PACKED'], ['bss', 'pq-enc:BYTE_STREAM_SPLIT']])
  same('pyarrow ' + n + ': mesaj dedicat în loc de date greșite', (await conv('pa_types_' + n + '.parquet')).err, c);
r = await conv('pa_dictarrow_rg.parquet'); T = cols(parse(r.csv || ''));
const pat = ['a', 'b', 'a', '', 'c', 'b'];
check('pyarrow: coloană dictionary arrow, 300 de rânduri în 5 grupuri de rânduri', r.pq.rows === 300 && T.k.every((v, i) => v === String(i)) && T.cat.every((v, i) => v === pat[i % 6]), r.pq);
r = await conv('pa_extremes.parquet'); T = cols(parse(r.csv || ''));
same('uint8/uint16 corecte', [T.u8, T.u16], [['0', '255', ''], ['0', '65535', '']]);
same('uint32 fără semn (2^32-1 și 2^31 nu devin negative)', T.u32, ['0', '4294967295', '2147483648']);
same('uint64 fără semn (2^64-1, 2^63)', T.u64, ['0', '18446744073709551615', '9223372036854775808']);
same('int64: -2^63, 2^63-1 și 2^53+1 exacte (BigInt)', T.i64, ['-9223372036854775808', '9223372036854775807', '9007199254740993']);
same('timestamp nanosecunde: trunchiat la milisecunde (limită documentată)', T.ts_ns, ['1970-01-01 00:00:00', '2023-11-14 22:13:20.123', '']);
r = await conv('pa_int96.parquet'); same('INT96 (timestamp depreciat)', cols(parse(r.csv)).ts, ['2024-03-15 10:30:05.123', '', '1999-12-31 23:59:59']);
same('pyarrow: tabel cu 0 rânduri → eroare „empty”', (await conv('pa_zero_rows.parquet')).err, 'empty');
r = await conv('pa_one_column.parquet'); same('pyarrow: o singură coloană', r.csv, 'a\n1\n2\n3');
/* ---------- parquet fastparquet (alt scriitor) ---------- */
for (const n of ['none', 'snappy', 'gzip']) {
  r = await conv('fp_' + n + '.parquet'); T = cols(parse(r.csv || ''));
  check('fastparquet ' + n + ': 7 rânduri în 3 grupuri, nuluri, dată+oră, bool', r.pq && r.pq.rows === 7 && JSON.stringify(T.id) === '["0","1","2","3","4","5","6"]' && JSON.stringify(T.x) === '["0.5","1.5","","3.5","4.5","5.5","6.5"]' && JSON.stringify(T.s) === '["a","ă","","d","e","f","g"]' && JSON.stringify(T.b) === '["true","false","true","true","false","true","false"]' && JSON.stringify(T.d) === '["2024-01-01 00:00:00","2024-01-02 03:04:05","","2000-01-01 00:00:00","2024-01-05 00:00:00","2024-01-06 00:00:00","2024-01-07 00:00:00"]', [r.err, r.csv]);
}
check('fără cereri de rețea', net.length === 0, net);
check('fără erori JS', errs.length === 0, errs);
await b.close();
console.log(`\nDataWeave fixture-uri reale: ${ok} ok, ${bad} eșuate`); process.exit(bad ? 1 : 0);
