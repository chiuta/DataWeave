// DataWeave — regresie: corelația Pearson cu valori foarte mari nu produce NaN; ținte tactile ≥44px pe mobil; selecturile filtrului au nume.
// Rulare: node tests/pearson-extreme.test.mjs
import fs from "fs";
import os from "os";
import path from "path";
import {chromium} from "/opt/node-tools/node_modules/playwright/index.mjs";

let fails = 0, passes = 0;
const check = (n, c, x) => { if (c) { passes++; console.log("  ok  " + n); } else { fails++; console.log("FAIL  " + n + (x !== undefined ? "  -> " + JSON.stringify(x) : "")); } };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dw-"));
const csv = path.join(tmp, "big.csv");
fs.writeFileSync(csv, "x,y\n1e200,1e200\n2e200,4e200\n3e200,9e200\n4e200,16e200\n");
const browser = await chromium.launch({executablePath: "/opt/pw-browsers/chromium"});
const ctx = await browser.newContext({viewport: {width: 390, height: 800}});
await ctx.route(/^https?:/, r => r.abort());
const page = await ctx.newPage();
await page.goto("file://" + path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "index.html"));
await page.waitForTimeout(1500);
const small = await page.evaluate(() => [...document.querySelectorAll("button,select")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 43.5 || r.width < 43.5); }).map(e => e.id || e.className));
check("butoane/selecturi vizibile ≥44px la 390px", small.length === 0, small);
await page.setInputFiles("#fileInput", csv);
await page.waitForTimeout(1200);
const noname = await page.evaluate(() => ["flCol", "flOp"].filter(id => !document.getElementById(id).getAttribute("aria-labelledby")));
check("selecturile filtrului au nume accesibil", noname.length === 0, noname);
for (const t of await page.$$("[role=tab],.tab,nav button")) { try { await t.click({timeout: 400}); await page.waitForTimeout(150); } catch (e) {} }
await page.waitForTimeout(500);
const txt = await page.evaluate(() => document.querySelector("#corrHolder").textContent);
check("matricea de corelație nu conține NaN (valori ~1e200)", !/NaN/.test(txt) && /1\.00/.test(txt), txt.slice(0, 200));
await browser.close();
console.log(`\n${passes} ok, ${fails} eșuate`);
process.exit(fails ? 1 : 0);
