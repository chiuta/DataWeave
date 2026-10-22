# DataWeave

**English** · [Română](README.ro.md) · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [Deutsch](README.de.md) · [Magyar](README.hu.md)

**Version:** 7.3.5 · **Last updated:** 2026-10-22

Interface languages: **Română, English, Français, Italiano, Español, Português (PT), Deutsch, Magyar**

A workshop for visualising and analysing tabular data, right in the browser.

**Live app:** https://chiuta.github.io/DataWeave/

![Screenshot](screenshot.en.png)

## What it is

DataWeave is a single-file HTML application for exploring CSV, TSV and JSON files: table, statistics, charts, pivot table and correlations. It is designed, as the app puts it, for journalists, researchers and teachers; your data stays on your device.

## Features

- Loading by dragging a file, "Choose file" or "Paste data" (CSV, TSV, JSON); three demo datasets: Iris (flowers, the classic 150 rows), European Cities, Monthly Sales.
- The Table tabs (sorting by clicking anywhere on the header cell or Enter/Space on the name), Statistics, Charts, Pivot, Correlations.
- Multiple filters ("+ Add", "Clear all").
- Data tools: remove duplicates, trim whitespace, computed column, reorder and hide columns.
- Charts: bar, line, scatter, histogram, box plot, heatmap, pie; aggregations (sum, mean, median, count, min, max, standard deviation), colour by column, Top-N, horizontal, value labels, stacked.
- Regression (linear, logarithmic, exponential, power, polynomial of degree 2 and 3), confidence and prediction intervals (90/95/99%), normal curve, mean/median, moving average.
- Pivot with rows, optional columns, value and aggregation; CSV export.
- Pearson or Spearman correlations, with SVG/PNG export.
- "Save session" / "Load session"; export of statistics, JSON, CSV; charts as SVG or PNG.
- Computed column with arithmetic operators, comparisons, ternary and functions (sqrt, log, log10, abs, round, floor, ceil, min, max, pow, exp, sin, cos, pi), evaluated without `eval`.
- Light/dark theme (the ☾ button) and interface in 7 languages: English, Română, Français, Italiano, Español, Português, Deutsch.

## New features (7.2.0)

- **Table search by relevance** (BM25, tolerance for typos, diacritics ignored), when the table has no manual sort; the indicator shows "· by relevance". It applies to at most 20000 rows; above that limit the old literal search remains.
- **"Personal data"**: locally scans the visible cells (e-mail, phone, IBAN, CNP, card, IP, secrets; optionally names/addresses, with many false positives), displays a table of the matches and exports a CSV with masked values (full or partial replacement). The results are indicative: the absence of a match does not guarantee that the data contains no personal information.
- The shared "fff-kit" modules are included (the version in the footer opens the transparency dialog); the app uses no storage, so the backup dialog has nothing to save.
- The new texts are in the 7 interface languages; **the translations have not been checked by native speakers.**

## User guide

1. Choose the language from the language menu.
2. Under "New data" drag a CSV/TSV/JSON file, press "Choose file" or "Paste data" (then "Load"); alternatively, choose a demo dataset.
3. In the Table tab you sort by clicking the header; "+ Add" under Filters adds a condition (Enter confirms).
4. Under "Data tools" you can remove duplicates, trim whitespace, create a "+ Computed column" or reorder/hide columns.
5. In Charts you choose the type, the X and Y axes and the aggregation, then optionally the regression or the intervals; download with "⬇ SVG" / "⬇ PNG".
6. In Pivot you choose rows, columns, value and aggregation, then "Export CSV".
7. In Correlations you choose the method (Pearson or Spearman).
8. "Save session" keeps your work in a file, which you resume with "Load session".
9. Esc closes the open panels (column form, paste area, the "About" window).

## Privacy and network

- The app does not use `localStorage`, `sessionStorage` or IndexedDB and makes no network requests (no `fetch`, CDN or external scripts). Loaded data is processed in memory and disappears on reload, apart from what you save through exports.
- It contains only links, opened on click, to Buy Me a Coffee and chiuta.github.io.

## Running locally / offline

Download `index.html` and open it in a browser; it does not need internet.

## History / Changelog

- 7.3.5 — 2026-10-22: fff-kit 1.1.4: touch targets and minimum text size
- 7.3.4 — 2026-10-22: fff-kit 1.1.2: PBKDF2 600,000 iterations, anti-clickjacking protection
- 7.3.2 — 2026-10-22: **fix**: demo datasets, sample chips, paste example, empty row/column counters and language-selector labels now follow the selected language.
- 7.3.1 — 2026-10-22: **fix**: the page title now follows the selected language.
### 7.3.3 — 2026-10-22
- A "Data in memory" indicator next to the file info (loaded text size; the tab's JS memory in the tooltip when the browser reports it), a warning for files over 50 MB and a message if reading the file fails.
- Mobile: no text below 12 px and touch targets of at least 24 px (WCAG 2.5.8).

### 7.2.0 — 14 October 2026
- Table search by relevance (FFF.search), keeping manual sorting.
- "Personal data": local scan and masked CSV export (FFF.pii).
- Shared modules core, label, bundle, search, pii; new tests: `tests/fff-r8.test.mjs`.

### 7.1.4 — 12 October 2026
- The version and the date of the last update are shown in the app (footer).

### 7.1.3 — 11 October 2026
- The Iris demo dataset now contains the classic 150 rows (previously 20).
- Sorting is triggered by a click anywhere on the header cell (not only on the name), has `aria-sort` and works from the keyboard; the type selector does not sort.
- Skewness fix: the adjusted formula now uses the population standard deviation in standardisation (checked against scipy `skew(bias=False)`).
- The standard deviation is labelled "(n−1)" (sample) in all 7 languages.
- CSP: `connect-src 'none'` (the app makes no network requests at all).

### 7.1.2 — 11 October 2026
- Security: the computed column uses its own expression evaluator (no `eval`/`new Function`); the CSP no longer contains `'unsafe-eval'` and `'unsafe-inline'` for scripts (script-src by SHA-256 hash), and `worker-src` is `'none'`. The behaviour of existing formulas is identical (checked on 25 expressions).
- Formulas: new functions `floor`, `ceil`, `exp`, `log10`, `sin`, `cos`, the constant `pi` and the ternary operator `a>b?x:y`, with the hint updated in all 7 languages.
- Accessibility: tabs are now keyboard-navigable (Tab, arrows, Home/End, Enter/Space), with ARIA roles `tablist`/`tab`/`tabpanel`.
- Printing: a print style that keeps only the active panel.

### 7.1.1 — 11 October 2026
- Accessibility: h1 heading, main area (main), labels for the language selector and the theme button, status region for notifications; axe check without violations.
- Correlations tab: explanatory legend and the strongest pair of columns, in all 7 languages.
- Version updated to v7.1.1.

## License

MIT — see the LICENSE file

## Author

Alexio — Alexandru-Ionuț Chiuță, contact: alexio@trom.tf
