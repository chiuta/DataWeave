// Teste r8 (14 oct. 2026): căutare locală în tabel (FFF.search) + verificare date personale (FFF.pii).
// Rulare: node tests/fff-r8.test.mjs  (Playwright din /opt/node-tools, Chromium local, rețea blocată)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require = createRequire('/opt/node-tools/package.json');
const {chromium} = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILE = 'file://' + path.join(HERE, '..', 'index.html');
const AXE = process.env.FFF_AXE || '/tmp/claude-0/-home-claude/78529928-3825-51c3-b9bd-0e81655ab6bc/scratchpad/sweep/node_modules/axe-core/axe.min.js';
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };

const CSV = [
  'nume,email,telefon,iban,descriere',
  'Ana Pop,ana.pop@example.org,+40 722 123 456,RO49AAAA1B31007593840000,Grădină cu plante medicinale și flori',
  'Ion Ionescu,ion@example.com,0744 987 654,,Fotosinteza la plantele de apartament',
  'Maria Dinu,,,GB82WEST12345698765432,Experimente cu lumină artificială',
  'Vlad Radu,vlad@example.net,,,Algebră liniară și matrici'
].join('\n');

const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox']});
async function open(w = 1280, h = 800) {
  const ctx = await b.newContext({viewport: {width: w, height: h}, acceptDownloads: true, locale: 'ro-RO'});
  const net = [];
  await ctx.route(/^https?:/, (r) => { net.push(r.request().url()); r.abort(); });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { const t = m.text(); if (/Content Security Policy|Refused to/i.test(t)) errs.push('csp: ' + t); });
  await page.goto(FILE);
  await page.waitForTimeout(500);
  await page.selectOption('#langSel', 'ro');
  return {ctx, page, errs, net};
}
const firstCol = (page) => page.$$eval('#dataTable tbody tr', (trs) => trs.map((t) => t.children[1].textContent.trim()));

{
  const {ctx, page, errs, net} = await open();
  check('versiune 7.3.5 în meta și #app-version', await page.evaluate(() => document.querySelector('meta[name=application-version]').content === '7.3.5' && /^v7\.3\.5 · 2026-10-22$/.test(document.getElementById('app-version').textContent.trim())));
  check('buton „Date personale” vizibil cu kitul', await page.evaluate(() => !document.getElementById('btnPii').hidden));
  await page.evaluate((t) => loadText(t, 'persoane.csv'), CSV);
  await page.waitForTimeout(300);
  check('4 rânduri încărcate', (await firstCol(page)).length === 4);

  // --- căutare locală ---
  await page.fill('#tblSearch', 'planta');
  await page.waitForTimeout(500);
  let rows = await firstCol(page);
  check('„planta” găsește rândurile cu „plante”/„plantele” (stemming), cele mai relevante primele', rows.length === 2 && rows.includes('Ana Pop') && rows.includes('Ion Ionescu'), rows);
  check('pastila arată „după relevanță”', /după relevanță/.test(await page.textContent('#tblShown')), await page.textContent('#tblShown'));
  await page.fill('#tblSearch', 'fotosinteza');
  await page.waitForTimeout(500);
  rows = await firstCol(page);
  check('„fotosinteza” (fără diacritice/literal) → Ion', rows.length === 1 && rows[0] === 'Ion Ionescu', rows);
  await page.fill('#tblSearch', 'fotosintezza');
  await page.waitForTimeout(500);
  rows = await firstCol(page);
  check('greșeală de scriere „fotosintezza” tot găsește rândul (fuzzy)', rows.length === 1 && rows[0] === 'Ion Ionescu', rows);
  await page.fill('#tblSearch', 'vlad@');
  await page.waitForTimeout(500);
  rows = await firstCol(page);
  check('potrivirea literală veche se păstrează („vlad@”)', rows.length === 1 && rows[0] === 'Vlad Radu', rows);
  await page.fill('#tblSearch', 'qqqqzzzz');
  await page.waitForTimeout(500);
  check('fără potriviri → 0 rânduri', (await firstCol(page)).length === 0);
  await page.fill('#tblSearch', 'planta');
  await page.waitForTimeout(500);
  await page.click('#dataTable th[data-key="c0"] .hsort');
  await page.waitForTimeout(200);
  rows = await firstCol(page);
  check('sortarea manuală are prioritate față de relevanță (Ana, Ion)', rows[0] === 'Ana Pop' && !/după relevanță/.test(await page.textContent('#tblShown')), rows);
  await page.fill('#tblSearch', '');
  await page.waitForTimeout(500);
  check('golind căutarea revin 4 rânduri', (await firstCol(page)).length === 4);

  // --- date personale ---
  await page.click('#btnPii');
  check('dialogul „Date personale” e deschis', await page.evaluate(() => document.getElementById('piiDlg').open));
  await page.click('#piiRun');
  await page.waitForFunction(() => /celule/.test(document.getElementById('piiStatus').textContent), null, {timeout: 8000});
  const cols = await page.$$eval('#piiOut tbody tr', (trs) => trs.map((t) => [...t.children].map((c) => c.textContent)));
  const byName = Object.fromEntries(cols.map((r) => [r[0], r]));
  check('detectează e-mailuri în coloana „email”', byName.email && /E-?mail/i.test(byName.email[2]) && byName.email[1] === '3', cols);
  check('detectează telefoane în „telefon”', byName.telefon && byName.telefon[1] === '2', cols);
  check('detectează IBAN valid în „iban” (2)', byName.iban && byName.iban[1] === '2', cols);
  check('„descriere” și „nume” fără euristici nu sunt semnalate', !byName.descriere && !byName.nume, cols);
  check('exemplul e mascat (fără e-mail întreg)', !cols.some((r) => /ana\.pop@example\.org/.test(r[3])), cols.map((r) => r[3]));
  const [d1] = await Promise.all([page.waitForEvent('download'), page.click('#piiExpPlace')]);
  const csv1 = fs.readFileSync(await d1.path(), 'utf8');
  check('CSV mascat cu etichete: nicio adresă/IBAN/telefon în clar', !/example\.(org|com|net)|RO49AAAA|GB82WEST|722 123 456|0744 987/.test(csv1) && /\[EMAIL\]/.test(csv1) && /\[IBAN\]/.test(csv1) && /\[PHONE\]/.test(csv1), csv1);
  check('restul datelor rămân neschimbate (Ana Pop, descriere)', /Ana Pop/.test(csv1) && /Algebră liniară/.test(csv1));
  const [d2] = await Promise.all([page.waitForEvent('download'), page.click('#piiExpPart')]);
  const csv2 = fs.readFileSync(await d2.path(), 'utf8');
  check('CSV parțial mascat: forma a***@e***.org', /a\*\*\*@e\*\*\*\.org/.test(csv2) && !/ana\.pop@example\.org/.test(csv2), csv2.slice(0, 300));
  await page.evaluate(fs.readFileSync(AXE, 'utf8') + '\n;0');
  const ax = await page.evaluate(async () => (await window.axe.run(document.getElementById('piiDlg'), {resultTypes: ['violations']})).violations.map((v) => v.id + ':' + v.nodes.length));
  check('axe 0 violări în dialog', ax.length === 0, ax);
  await page.keyboard.press('Escape');
  check('Escape închide dialogul', await page.evaluate(() => !document.getElementById('piiDlg').open));

  // euristici: nume
  await page.click('#btnPii'); await page.check('#piiHeur'); await page.click('#piiRun');
  await page.waitForFunction(() => /celule|Nu s-au/.test(document.getElementById('piiStatus').textContent), null, {timeout: 8000});
  const withHeur = await page.$$eval('#piiOut tbody tr', (trs) => trs.map((t) => t.children[0].textContent));
  check('cu euristici apare și coloana „nume”', withHeur.includes('nume'), withHeur);
  await page.keyboard.press('Escape');

  // seturi demonstrative: fără fals-pozitive
  check('0 erori / 0 CSP / 0 rețea', errs.length === 0 && net.length === 0, {errs, net});
  await ctx.close();
}
{
  // set demonstrativ Iris: nicio detecție
  const {ctx, page} = await open();
  for (const sample of ['iris', 'cities', 'sales']) {
  await page.evaluate(() => location.reload()); await page.waitForTimeout(500);
  await page.click(`[data-sample="${sample}"]`);
  await page.waitForTimeout(400);
  {
    await page.click('#btnPii'); await page.click('#piiRun');
    await page.waitForFunction(() => document.getElementById('piiStatus').textContent.length > 3 && !/Se scanează/.test(document.getElementById('piiStatus').textContent), null, {timeout: 8000});
    check(`set demonstrativ ${sample}: nicio dată personală semnalată (fără fals-pozitive)`, /Nu s-au găsit/.test(await page.textContent('#piiStatus')), await page.textContent('#piiStatus'));
  }}
  await ctx.close();
}
{
  // 360 px
  const {ctx, page} = await open(360, 740);
  await page.evaluate((t) => loadText(t, 'p.csv'), CSV);
  await page.waitForTimeout(300);
  await page.click('#btnPii'); await page.click('#piiRun');
  await page.waitForFunction(() => /celule/.test(document.getElementById('piiStatus').textContent), null, {timeout: 8000});
  const o = await page.evaluate(() => ({doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, dlg: document.querySelector('#piiDlg .modal').getBoundingClientRect().width}));
  check('fără depășire orizontală la 360 px cu dialogul deschis', o.doc <= 1 && o.dlg <= 360, o);
  await ctx.close();
}
{
  // fără kit: aplicația merge, butonul rămâne ascuns, căutarea literală funcționează
  const ctx = await b.newContext({viewport: {width: 1280, height: 800}, locale: 'ro-RO'});
  await ctx.route(/^https?:/, (r) => r.abort());
  await ctx.addInitScript(() => { Object.defineProperty(window, 'FFF', {get() { return undefined; }, set() {}, configurable: true}); });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(FILE); await page.waitForTimeout(500);
  await page.evaluate((t) => loadText(t, 'p.csv'), CSV);
  await page.fill('#tblSearch', 'vlad@'); await page.waitForTimeout(400);
  check('fără kit: butonul PII rămâne ascuns', await page.evaluate(() => document.getElementById('btnPii').hidden));
  check('fără kit: căutarea literală funcționează, 0 erori', (await firstCol(page)).join() === 'Vlad Radu' && errs.length === 0, errs);
  await ctx.close();
}
await b.close();
console.log(`DataWeave fff-r8: ${ok} ok, ${bad} eșuate`);
process.exit(bad ? 1 : 0);
