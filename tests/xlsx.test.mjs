// Teste 8.1.0: import Excel (.xlsx) compact, fără biblioteci. Fișierele .xlsx se construiesc aici (ZIP scris de mână) ca să nu depindă de nimic extern.
// Rulare: node tests/xlsx.test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require = createRequire(process.env.PW_ROOT || import.meta.url);
const {chromium} = require('playwright');
const FILE = 'file://' + path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html');
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const crc = (b) => zlib.crc32(b);
function zip(files) {
  const parts = [], cd = []; let off = 0;
  for (const [name, data] of Object.entries(files)) {
    const raw = Buffer.from(data), method = name.endsWith('.stored') ? 0 : 8, comp = method ? zlib.deflateRawSync(raw) : raw, nm = Buffer.from(name), c = crc(raw);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(method, 8); lh.writeUInt32LE(c, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nm.length, 26);
    parts.push(lh, nm, comp);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt16LE(method, 10); ch.writeUInt32LE(c, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nm.length, 28); ch.writeUInt32LE(off, 42);
    cd.push(ch, nm); off += 30 + nm.length + comp.length;
  }
  const cdb = Buffer.concat(cd), eo = Buffer.alloc(22); eo.writeUInt32LE(0x06054b50, 0); eo.writeUInt16LE(cd.length / 2, 8); eo.writeUInt16LE(cd.length / 2, 10); eo.writeUInt32LE(cdb.length, 12); eo.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cdb, eo]);
}
const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
const xl = {
  '[Content_Types].xml': '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
  'xl/workbook.xml': `<?xml version="1.0"?><workbook ${NS} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Ascunsă" sheetId="1" state="hidden" r:id="rId1"/><sheet name="Date" sheetId="2" r:id="rId2"/></sheets></workbook>`,
  'xl/_rels/workbook.xml.rels': '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="x" Target="/xl/worksheets/sheet2.xml"/></Relationships>',
  'xl/styles.xml': `<?xml version="1.0"?><styleSheet ${NS}><numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="0.0&quot; ms&quot;"/></numFmts><cellXfs count="5"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/><xf numFmtId="2"/><xf numFmtId="165"/></cellXfs></styleSheet>`,
  'xl/sharedStrings.xml': `<?xml version="1.0"?><sst ${NS}><si><t>Nume</t></si><si><t>Preț</t></si><si><r><t xml:space="preserve">Ana </t></r><r><t>Pop</t></r></si><si><t>Data</t></si><si><t>Bob</t><rPh sb="0" eb="1"><t>IGNORAT</t></rPh></si><si><t>Activ</t></si><si><t>Notă</t></si><si><t>Ms</t></si></sst>`,
  'xl/worksheets/sheet1.xml': `<?xml version="1.0"?><worksheet ${NS}><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>DOAR-ASCUNSA</t></is></c></row></sheetData></worksheet>`,
  'xl/worksheets/sheet2.xml': `<?xml version="1.0"?><worksheet ${NS}><sheetData>
<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>3</v></c><c r="D1" t="s"><v>5</v></c><c r="E1" t="s"><v>6</v></c><c r="F1" t="s"><v>7</v></c></row>
<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" s="3"><v>10.5</v></c><c r="C2" s="1"><v>44927</v></c><c r="D2" t="b"><v>1</v></c><c r="E2" t="inlineStr"><is><t>ok, "cu" virgulă</t></is></c><c r="F2" s="4"><v>12.5</v></c></row>
<row r="3"><c r="A3" t="s"><v>4</v></c><c r="B3"><v>20</v></c><c r="C3" s="2"><v>44927.5</v></c><c r="D3" t="b"><v>0</v></c><c r="E3" t="str"><f>A3&amp;"!"</f><v>Bob!</v></c></row>
<row r="4"></row>
<row r="5"><c r="A5" t="inlineStr"><is><t>Dana</t></is></c><c r="C5" s="1"><v>45000</v></c><c r="D5" t="e"><v>#N/A</v></c></row>
</sheetData></worksheet>`
};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-xlsx-'));
fs.writeFileSync(path.join(tmp, 'test.xlsx'), zip(xl));
fs.writeFileSync(path.join(tmp, 'fals.xlsx'), 'asta nu e un zip');
fs.writeFileSync(path.join(tmp, 'vechi.xls'), 'xx');
fs.writeFileSync(path.join(tmp, 'stored.xlsx'), zip({...xl, 'xl/sharedStrings.xml': xl['xl/sharedStrings.xml']}));
// variantă cu sharedStrings stocat (nedeflatat)
const xl2 = {...xl}; delete xl2['xl/sharedStrings.xml']; xl2['xl/sharedStrings.xml.stored'] = ''; 
const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});
const ctx = await b.newContext({viewport: {width: 1300, height: 1000}, locale: 'ro-RO'});
const net = [];
await ctx.route(/^https?:/, (r) => { net.push(r.request().url()); r.abort(); });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(FILE); await page.waitForTimeout(500);
const toastText = () => page.$eval('#toast', (e) => e.textContent);
await page.setInputFiles('#fileInput', path.join(tmp, 'test.xlsx')); await page.waitForTimeout(800);
const st = await page.evaluate(() => ({cols: state.columns.map((c) => c.name), types: state.columns.map((c) => c.type), raw: state.raw, file: state.fileName}));
check('coloane din prima foaie vizibilă (cea ascunsă e sărită)', st.cols.join('|') === 'Nume|Preț|Data|Activ|Notă|Ms', st.cols);
check('numele fișierului devine test.csv', st.file === 'test.csv', st.file);
check('șir cu text îmbogățit (r/t) lipit', st.raw[0][0] === 'Ana Pop', st.raw[0]);
check('număr păstrat', st.raw[0][1] === '10.5' && st.raw[1][1] === '20', st.raw);
check('dată (format 14) → ISO', st.raw[0][2] === '2023-01-01', st.raw[0]);
check('dată+oră (format personalizat dd/mm/yyyy) → ISO cu oră', st.raw[1][2] === '2023-01-01 12:00:00', st.raw[1]);
check('boolean → TRUE/FALSE', st.raw[0][3] === 'TRUE' && st.raw[1][3] === 'FALSE', st.raw);
check('șir inline cu virgulă și ghilimele', st.raw[0][4] === 'ok, "cu" virgulă', st.raw[0]);
check('formulă: valoarea în cache', st.raw[1][4] === 'Bob!', st.raw[1]);
check('rRh (fonetic) ignorat', st.raw[1][0] === 'Bob', st.raw[1]);
check('număr cu format personalizat cu „ ms” nu devine dată', st.raw[0][5] === '12.5', st.raw[0]);
check('rând gol omis; celulă lipsă (B5) goală; dată sparsă', st.raw.length === 3 && st.raw[2][0] === 'Dana' && st.raw[2][1] === '' && st.raw[2][2] === '2023-03-15', st.raw);
check('eroare #N/A → celulă goală', st.raw[2][3] === '', st.raw[2]);
check('tip număr inferat pentru Preț', st.types[1] === 'number', st.types);
check('mesaj cu numele foii', /Date/.test(await toastText()), await toastText());
// fișier fals
await page.setInputFiles('#fileInput', path.join(tmp, 'fals.xlsx')); await page.waitForTimeout(600);
check('fișier .xlsx invalid: mesaj de eroare', /Excel/.test(await toastText()) && /CSV/.test(await toastText()), await toastText());
check('datele anterioare rămân', await page.evaluate(() => state.columns.length) === 6);
await page.setInputFiles('#fileInput', path.join(tmp, 'vechi.xls')); await page.waitForTimeout(400);
check('.xls vechi: mesaj clar', /\.xls/.test(await toastText()), await toastText());
// caiet: aplică pe alt fișier (xlsx)
await page.setInputFiles('#nbApplyIn', path.join(tmp, 'test.xlsx')); await page.waitForTimeout(800);
check('caiet: „Aplică pe alt fișier” acceptă .xlsx', /test\.xlsx/.test(await toastText()), await toastText());
check('fără cereri de rețea', net.length === 0, net);
check('fără erori JS', errs.length === 0, errs);
check('accept include .xlsx', await page.$eval('#fileInput', (e) => /\.xlsx/.test(e.accept)));
await b.close(); fs.rmSync(tmp, {recursive: true, force: true});
console.log(`\nDataWeave xlsx: ${ok} ok, ${bad} eșuate`); process.exit(bad ? 1 : 0);
