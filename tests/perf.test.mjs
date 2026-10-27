// Test de performanță 8.1.0: încărcare + trecere prin file pe seturi sintetice mari (CSV generat în pagină, fără rețea).
// Nu are praguri stricte (depind de mașină): afișează timpii măsurați și verifică doar că aplicația rămâne funcțională
// și sub un plafon larg (PERF_MAX_LOAD_MS, implicit 60000). Rânduri: PERF_ROWS="50000,200000,500000".
// Rulare: node tests/perf.test.mjs
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require = createRequire(process.env.PW_ROOT || import.meta.url);
const {chromium} = require('playwright');
const FILE = 'file://' + path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html');
const SIZES = (process.env.PERF_ROWS || '50000,200000,500000').split(',').map(Number);
const MAX = Number(process.env.PERF_MAX_LOAD_MS || 60000);
let ok = 0, bad = 0;
const check = (n, c, x) => { if (c) { ok++; console.log('  ok   ' + n); } else { bad++; console.log('  FAIL ' + n + (x !== undefined ? '  → ' + JSON.stringify(x) : '')); } };
const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--js-flags=--max-old-space-size=4096']});
// --- calea rapidă din parseMaybeNumber (8.1.0) trebuie să dea exact aceleași rezultate ca varianta lungă
{
  const ctx = await b.newContext(); const page = await ctx.newPage(); await page.goto(FILE); await page.waitForTimeout(400);
  const res = await page.evaluate(() => {
    const ref = (s) => { if (s == null) return null; let t = String(s).trim(); if (t === '') return null; let v = t.replace(/\s/g, '');
      if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(v)) v = v.replace(/\./g, '').replace(',', '.'); else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(v)) v = v.replace(/,/g, ''); else if (/^-?\d+,\d+$/.test(v)) v = v.replace(',', '.');
      if (/^-?\d*\.?\d+([eE][+-]?\d+)?%?$/.test(v)) { const pct = v.endsWith('%'); const num = parseFloat(pct ? v.slice(0, -1) : v); if (Number.isFinite(num)) return pct ? num / 100 : num; } return NaN; };
    const cases = ['1.234', '1,234', '10.50', '10.500', '1234.567', '-0.5', '007', '1e5', '12,5', '1.234.567,89', '-12', '+5', '5.', '  42  ', '0.000', '123.456', '1.2345', '99.9', '-1.234', '12.345.678', '', ' ', 'abc', '3.14%', '1 234', '0', '-0', '00.50', '999.999', '1000.000'];
    let s = 7; const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let i = 0; i < 3000; i++) { const a = Math.floor(rnd() * 100000), f = Math.floor(rnd() * 10000); cases.push(String(a), a + '.' + String(f).slice(0, 1 + Math.floor(rnd() * 4)), '-' + a + '.' + f); }
    const bad = cases.filter((c) => { const x = parseMaybeNumber(c), y = ref(c); return !(Object.is(x, y) || (Number.isNaN(x) && Number.isNaN(y)) || x === y); });
    return {n: cases.length, bad: bad.slice(0, 5)};
  });
  check(`parseMaybeNumber: calea rapidă = varianta lungă pe ${res.n} șiruri`, res.bad.length === 0, res.bad);
  await ctx.close();
}
const table = [];
for (const n of SIZES) {
  const ctx = await b.newContext({viewport: {width: 1300, height: 1000}, locale: 'en-US'});
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(FILE); await page.waitForTimeout(400);
  const r = await page.evaluate(async (N) => {
    // generare deterministă (LCG) a unui CSV cu 8 coloane: id, 3 numerice, 2 categorii, dată, text
    let s = 12345; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    const cats = ['Nord', 'Sud', 'Est', 'Vest', 'Centru'], prod = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const out = ['id,pret,cantitate,discount,regiune,produs,data,nota'];
    for (let i = 0; i < N; i++) out.push([i, (rnd() * 1000).toFixed(2), 1 + Math.floor(rnd() * 50), (rnd() * 0.3).toFixed(3), cats[Math.floor(rnd() * 5)], prod[Math.floor(rnd() * 8)], '2024-' + String(1 + Math.floor(rnd() * 12)).padStart(2, '0') + '-' + String(1 + Math.floor(rnd() * 28)).padStart(2, '0'), 'rând ' + i].join(','));
    const text = out.join('\n');
    const nxt = () => new Promise((res) => requestAnimationFrame(() => setTimeout(res, 0)));
    const t0 = performance.now(); loadText(text, 'perf.csv'); await nxt(); const tLoad = performance.now() - t0;
    const times = {};
    for (const tab of ['stats', 'chart', 'pivot', 'corr', 'table']) {
      const el = document.querySelector('.tab[data-tab="' + tab + '"]'); const t1 = performance.now(); el.click(); await nxt(); times[tab] = Math.round(performance.now() - t1);
    }
    const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
    return {bytes: text.length, rows: state.rows.length, cols: state.columns.length, tLoad: Math.round(tLoad), times, mem};
  }, n);
  table.push({n, mb: (r.bytes / 1048576).toFixed(1), load: r.tLoad, ...r.times, mem: r.mem});
  check(`${n} rânduri: încărcat complet (${r.rows} rânduri, ${r.cols} coloane)`, r.rows === n && r.cols === 8, r);
  check(`${n} rânduri: încărcare sub ${MAX} ms (${r.tLoad} ms)`, r.tLoad < MAX);
  check(`${n} rânduri: fără erori JS`, errs.length === 0, errs);
  await ctx.close();
}
console.log('\nrânduri | MB text | încărcare ms | Statistici | Grafice | Pivot | Corelații | Tabel | heap JS MB');
for (const t of table) console.log([t.n, t.mb, t.load, t.stats, t.chart, t.pivot, t.corr, t.table, t.mem].join(' | '));
await b.close();
console.log(`\nDataWeave perf: ${ok} ok, ${bad} eșuate`); process.exit(bad ? 1 : 0);
