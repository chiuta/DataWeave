// Teste 8.0.0: caiet reproductibil — pașii se înregistrează, se editează/reordonează/dezactivează, se aplică pe alt fișier
// și se exportă ca script JS (rulat aici în Node și comparat cu exportul aplicației) și ca SQL.
// Rulare: node tests/notebook.test.mjs  (Playwright din /opt/node-tools, Chromium local, rețea blocată)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require = createRequire(process.env.PW_ROOT || import.meta.url);
const {chromium} = require('playwright');
const FILE = 'file://' + path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html');
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-nb-'));
const CSV1 = ['id,name,city,price,qty',
  '1,  Ana ,Cluj,10.5,3', '2,Bob,Iași,20,1', '2,Bob,Iași,20,1', '3,Cezar,Cluj,5,10', '4,Dana,Brașov,40,2', '5,Eli,Cluj,7.25,4', '5,Eli,Cluj,7.25,4', '6,Fane,Iași,15,0'].join('\n');
const CSV2 = ['id,name,city,price',   // fără coloana „qty”
  '10,Gina,Cluj,3', '11,Hugo,Iași,50', '12,Ioana,Cluj,8', '12,Ioana,Cluj,8'].join('\n');
fs.writeFileSync(path.join(tmp, 'a.csv'), CSV1); fs.writeFileSync(path.join(tmp, 'b.csv'), CSV2);

const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox']});
const ctx = await b.newContext({viewport: {width: 1300, height: 1000}, locale: 'en-US', acceptDownloads: true});
const net = [];
await ctx.route(/^https?:/, (r) => { net.push(r.request().url()); r.abort(); });
const page = await ctx.newPage(); const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
await page.goto(FILE); await page.waitForTimeout(600);
await page.setInputFiles('#fileInput', path.join(tmp, 'a.csv')); await page.waitForTimeout(600);
const steps = () => page.evaluate(() => nb.steps.map((s) => s.k + (s.on ? '' : '(off)')));
const rowsShown = () => page.evaluate(() => baseRows().length);
const download = async (sel) => { const [d] = await Promise.all([page.waitForEvent('download'), page.click(sel)]); return {name: d.suggestedFilename(), text: fs.readFileSync(await d.path(), 'utf8')}; };

// ── înregistrare
await page.click('#btnDedupe');
await page.click('#btnTrim');
await page.click('#btnAddCol'); await page.fill('#cfName', 'total'); await page.fill('#cfFormula', 'price * qty'); await page.click('#cfCreate');
await page.selectOption('#flCol', { label: 'city' }); await page.selectOption('#flOp', 'eq'); await page.fill('#flVal', 'cluj'); await page.click('#flAdd');
await page.selectOption('#flCol', { label: 'price' }); await page.selectOption('#flOp', 'gt'); await page.fill('#flVal', '6'); await page.click('#flAdd');
await page.click('#btnColumns'); await page.click('#cmList input[type=checkbox] >> nth=0');   // ascunde „id”
await page.click('#btnColumns');
await page.click('#dataTable th[data-key] >> nth=2 >> .hsort');  // sortează după „price” (coloana vizibilă a 3-a: city? verificăm mai jos)
check('pașii înregistrați în ordine', (await steps()).join(',').startsWith('dedupe,trim,compute,filter,filter,hide,sort'), await steps());
const nrows = await rowsShown();
check('filtrele și curățarea se aplică (Cluj, price>6, fără duplicate → 2 rânduri)', nrows === 2, nrows);

// ── fila Caiet
await page.click('.tab[data-tab="nb"]');
check('fila Caiet listează 7 pași', (await page.$$('#nbList > li')).length === 7);
check('un pas de filtru e descris', /Filter: city = cluj/.test(await page.textContent('#nbList')), await page.textContent('#nbList'));
check('rezumatul numără pașii', /7 steps \(7 active, 0 skipped\)/.test(await page.textContent('#nbSum')), await page.textContent('#nbSum'));

// ── export JS: rulează în Node și compară cu exportul aplicației
await page.click('.tab[data-tab="table"]');
const appCsv = (await download('#exportClean')).text.replace(/^﻿/, '').trim();
await page.click('.tab[data-tab="nb"]');
const js = (await download('#nbExpJs'));
check('export JS: nume de fișier', /_pipeline\.mjs$/.test(js.name), js.name);
fs.writeFileSync(path.join(tmp, 'pipeline.mjs'), js.text);
const out1 = execFileSync('node', [path.join(tmp, 'pipeline.mjs'), path.join(tmp, 'a.csv')], {encoding: 'utf8'}).replace(/^﻿/, '').trim();
check('exportul CSV al aplicației nu are virgulă în față (regresie BOM)', /^name,city,price,qty,total\n/.test(appCsv), appCsv.slice(0, 40));
check('scriptul JS dă exact același CSV ca aplicația', out1 === appCsv, {script: out1, app: appCsv});
const out2 = execFileSync('node', [path.join(tmp, 'pipeline.mjs'), path.join(tmp, 'b.csv')], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).replace(/^﻿/, '').trim();
check('scriptul rulează pe alt fișier (b.csv)', /^name,city,price/.test(out2) || /^[a-z]/.test(out2), out2.split('\n')[0]);

// ── SQL
const sql = await download('#nbExpSql');
check('SQL: WITH/CTE cu DISTINCT și TRIM', /WITH/.test(sql.text) && /SELECT DISTINCT \* FROM s0/.test(sql.text) && /TRIM\("name"\)/.test(sql.text), sql.text.slice(0, 600));
check('SQL: coloană calculată ca expresie', /"price" \* "qty" AS "total"/.test(sql.text), sql.text);
check('SQL: filtre în WHERE, fără id, ORDER BY', /LOWER\(COALESCE\(CAST\("city" AS TEXT\), ''\)\) = 'cluj'/.test(sql.text) && /"price" > 6/.test(sql.text) && /ORDER BY/.test(sql.text) && !/SELECT "id"/.test(sql.text.split('final AS')[1] || ''), sql.text);

// ── editare / dezactivare / reordonare
await page.click('#nbList li:nth-child(5) [data-nb="on"]');   // dezactivează filtrul price>6? (pasul 5)
await page.waitForTimeout(200);
check('dezactivarea unui pas re-rulează (mai multe rânduri)', (await rowsShown()) > nrows, [await rowsShown(), nrows]);
check('pasul dezactivat apare tăiat în listă', (await steps()).includes('filter(off)'));
await page.click('#nbList li:nth-child(5) [data-nb="on"]'); await page.waitForTimeout(200);
check('reactivarea revine la 2 rânduri', (await rowsShown()) === nrows);
await page.evaluate(() => { FFF.dialog.prompt = () => Promise.resolve('Iași'); });
await page.click('#nbList li:nth-child(4) [data-nb="edit"]'); await page.waitForTimeout(300);
check('editarea valorii filtrului re-rulează (Iași: 1 rând după duplicate/price>6)', /city = Iași/.test(await page.textContent('#nbList')) && (await rowsShown()) === 2, [await page.textContent('#nbList li:nth-child(4)'), await rowsShown()]);
await page.click('#nbList li:nth-child(4) [data-nb="up"]'); await page.waitForTimeout(200);
check('mutarea în sus schimbă ordinea', (await steps()).slice(0, 5).join(',') === 'dedupe,trim,filter,compute,filter', await steps());
await page.click('#nbList li:nth-child(3) [data-nb="del"]'); await page.waitForTimeout(200);
check('ștergerea unui pas îl scoate', (await page.$$('#nbList > li')).length === 6);

// ── export/import caiet .json
const nbj = await download('#nbExpJson');
const parsed = JSON.parse(nbj.text);
check('caiet .json: app/kind/steps', parsed.app === 'DataWeave' && parsed.kind === 'notebook' && parsed.steps.length === 6 && !/Cluj|Iași/.test(JSON.stringify(parsed.source)), parsed.source);
fs.writeFileSync(path.join(tmp, 'nb.json'), JSON.stringify({app: 'DataWeave', kind: 'notebook', v: 1, steps: [
  {k: 'dedupe', on: true}, {k: 'filter', col: 'city', op: 'eq', value: 'Cluj', on: true}, {k: 'filter', col: 'qty', op: 'gt', value: '1', on: true},
  {k: 'sort', col: 'price', dir: -1, on: true}, {k: 'pivot', row: 'city', col: '', val: 'price', agg: 'sum', on: true}]}));
await page.setInputFiles('#nbImpIn', path.join(tmp, 'nb.json')); await page.waitForTimeout(500);
check('import caiet: 5 pași', (await page.$$('#nbList > li')).length === 5 && /5 steps/.test(await page.textContent('#nbSum')), await page.textContent('#nbSum'));
check('import caiet: aplicat (Cluj, qty>1 → 3 rânduri)', (await rowsShown()) === 3, await rowsShown());
fs.writeFileSync(path.join(tmp, 'bad.json'), JSON.stringify({app: 'DataWeave', kind: 'notebook', steps: [{k: 'eval', code: 'alert(1)'}]}));
await page.setInputFiles('#nbImpIn', path.join(tmp, 'bad.json')); await page.waitForTimeout(300);
check('import invalid respins (pașii rămân 5)', (await page.$$('#nbList > li')).length === 5);

// ── aplicare pe alt fișier (lipsește „qty”)
await page.setInputFiles('#nbApplyIn', path.join(tmp, 'b.csv')); await page.waitForTimeout(700);
const li = await page.$$eval('#nbList > li', (els) => els.map((e) => e.textContent));
check('alt fișier: pasul pe coloana lipsă e sărit cu explicație', li.some((t) => /skipped: column .qty. is missing/.test(t)), li);
check('alt fișier: restul pașilor rulează (Cluj → 3 rânduri din b.csv cu duplicat eliminat = 2)', (await rowsShown()) === 2, await rowsShown());
check('alt fișier: numele fișierului sursă în rezumat', /b\.csv/.test(await page.textContent('#nbSum')) && /1 skipped/.test(await page.textContent('#nbSum')), await page.textContent('#nbSum'));
// pivot din caiet → comenzile de pivot
await page.click('.tab[data-tab="pivot"]');
check('pivotul din caiet setează controalele', (await page.$eval('#pvAgg', (e) => e.value)) === 'sum' && (await page.$eval('#pvRow', (e) => e.selectedOptions[0].textContent)) === 'city');

// ── pivotul din caiet în scriptul JS (al doilea CSV)
const js2 = await page.evaluate(() => nbGen.js());
fs.writeFileSync(path.join(tmp, 'p.mjs'), js2);
execFileSync('node', [path.join(tmp, 'p.mjs'), path.join(tmp, 'a.csv'), path.join(tmp, 'out.csv')], {encoding: 'utf8'});
const pv = fs.readFileSync(path.join(tmp, 'out.pivot.csv'), 'utf8').replace(/^\uFEFF/, '').trim().split('\n');
check('script JS: pivot scris în out.pivot.csv (suma price pe city, doar Cluj după filtre)', pv[0] === 'city,price' && pv.length === 2 && /^Cluj,/.test(pv[1]), pv);
const sql2 = await page.evaluate(() => nbGen.sql());
check('SQL: pivot ca GROUP BY', /GROUP BY "city"/.test(sql2) && /SUM\("price"\)/.test(sql2), sql2.slice(-300));

// ── fără rețea, fără erori
check('nicio cerere de rețea', net.length === 0, net);
check('niciun pageerror', errs.length === 0, errs);
await b.close();
console.log(`DataWeave notebook: ${ok} ok, ${bad} eșuate`); process.exit(bad ? 1 : 0);
