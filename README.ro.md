# DataWeave

[English](README.md) · **Română** · [Français](README.fr.md) · [Italiano](README.it.md) · [Español](README.es.md) · [Português](README.pt.md) · [Deutsch](README.de.md) · [Magyar](README.hu.md)

**Versiune:** 8.1.0 · **Ultima actualizare:** 2026-10-27

**Stare:** stabil · **Offline:** complet

Limbile interfeței: **Română, English, Français, Italiano, Español, Português (PT), Deutsch, Magyar**

Atelier de vizualizare și analiză a datelor tabelare, direct în browser.

**Live:** https://chiuta.github.io/DataWeave/

![Captura de ecran](screenshot.ro.png)

## Ce este

DataWeave este o aplicație HTML dintr-un singur fișier pentru explorarea fișierelor CSV, TSV și JSON: tabel, statistici, grafice, tabel pivot și corelații. Este gândită, după cum spune aplicația, pentru jurnaliști, cercetători și profesori; datele rămân pe dispozitivul tău.

## Funcții

- Încărcare prin tragere de fișier, „Alege fișier" sau „Lipește date" (CSV, TSV, JSON); trei seturi demonstrative: Iris (flori, cele 150 de rânduri clasice), Orașe Europa, Vânzări lunare.
- Filele Tabel (sortare prin click oriunde pe celula antetului sau Enter/Spațiu pe nume), Statistici, Grafice, Pivot, Corelații.
- Filtre multiple („+ Adaugă", „Șterge tot").
- Unelte de date: elimină duplicate, curăță spații, coloană calculată, reordonare și ascundere coloane.
- Grafice: bare, linie, scatter, histogramă, box-plot, heatmap, plăcintă; agregări (sumă, medie, mediană, număr, min, max, deviație standard), culoare după coloană, Top-N, orizontal, etichete de valori, stivuit.
- Regresie (liniară, logaritmică, exponențială, putere, polinomială grad 2 și 3), intervale de încredere și de predicție (90/95/99%), curbă normală, medie/mediană, medie mobilă.
- Pivot cu rânduri, coloane opționale, valoare și agregare; export CSV.
- Corelații Pearson sau Spearman, cu export SVG/PNG.
- „Salvează sesiune" / „Încarcă sesiune"; export statistici, JSON, CSV; grafice ca SVG sau PNG.
- Coloană calculată cu operatori aritmetici, comparații, ternar și funcții (sqrt, log, log10, abs, round, floor, ceil, min, max, pow, exp, sin, cos, pi), evaluate fără `eval`.
- Temă luminoasă/întunecată (butonul ☾) și interfață în 7 limbi: English, Română, Français, Italiano, Español, Português, Deutsch.
- **Import Excel, `.xlsx` / `.xlsm` (8.1.0):** tragi sau alegi un registru; se citește prima foaie *vizibilă*, formulele arată ultima valoare calculată, iar datele calendaristice sunt recunoscute din stilurile celulelor. Citirea se face în întregime în browser, cu un cititor compact (ZIP prin `DecompressionStream`, XML prin `DOMParser`); fără bibliotecă, fără rețea. Vechiul `.xls`, fișierele protejate cu parolă și **Parquet nu sunt acceptate** (Parquet este *planificat*: un cititor compact ar cere decodare Thrift + Snappy).
- **Test de performanță (8.1.0):** `tests/perf.test.mjs` generează în pagină CSV-uri sintetice (8 coloane) și măsoară încărcarea și trecerea între file. Rulare orientativă pe un container partajat cu 2 vCPU și încărcare foarte mare (load average ≈ 37, deci valorile sunt maxime; repetă pe calculatorul tău): 50 000 de rânduri (2,4 MB) ≈ 7 s la încărcare; 200 000 (9,8 MB) ≈ 15 s; 500 000 (24,9 MB) ≈ 32 s, cu memorie JS în jur de 290 MB; filele Statistici și Corelații cresc aproximativ liniar cu numărul de rânduri. **Parsarea și inferența tipurilor rulează pe firul principal (fără Web Worker sau streaming deocamdată - planificat)**, deci pagina nu răspunde cât timp se încarcă un fișier mare.
- Cale rapidă la parsarea numerelor (rezultate identice, verificate de test pe 9 000 de șiruri) și mențiunea `.xlsx` în zona de tragere.
- Exportul graficelor în SVG/PNG exista deja („⬇ SVG” / „⬇ PNG”).

## Funcții noi (7.2.0)

- **Căutare în tabel după relevanță** (BM25, toleranță la greșeli de scriere, diacritice ignorate), atunci când tabelul nu are o sortare manuală; indicatorul arată „· după relevanță”. Se aplică la cel mult 20000 de rânduri; peste această limită rămâne căutarea literală veche.
- **„Date personale”**: scanează local celulele vizibile (e-mail, telefon, IBAN, CNP, card, IP, secrete; opțional nume/adrese, cu multe false pozitive), afișează un tabel cu potrivirile și exportă un CSV cu valorile mascate (înlocuire completă sau parțială). Rezultatele sunt orientative: lipsa unei potriviri nu garantează că datele nu conțin informații personale.
- Modulele comune „fff-kit” sunt incluse (versiunea în subsol deschide dialogul de transparență); aplicația nu folosește stocare, deci dialogul de copie de siguranță nu are ce salva.
- Textele noi sunt în cele 7 limbi ale interfeței; **traducerile nu au fost verificate de vorbitori nativi.**

## Manual de utilizare

1. Alege limba din meniul de limbă.
2. În „Date noi" trage un fișier CSV/TSV/JSON, apasă „Alege fișier" sau „Lipește date" (apoi „Încarcă"); alternativ, alege un set demonstrativ.
3. În fila Tabel sortezi cu click pe antet; „+ Adaugă" la Filtre adaugă o condiție (Enter confirmă).
4. În „Unelte date" poți elimina duplicate, curăța spații, crea o „+ Coloană calculată" sau reordona/ascunde coloane.
5. În Grafice alegi tipul, axele X și Y și agregarea, apoi opțional regresia sau intervalele; descarcă cu „⬇ SVG" / „⬇ PNG".
6. În Pivot alegi rânduri, coloane, valoare și agregare, apoi „Export CSV".
7. În Corelații alegi metoda (Pearson sau Spearman).
8. „Salvează sesiune" păstrează lucrul într-un fișier, pe care îl reiei cu „Încarcă sesiune".
9. Esc închide panourile deschise (formular de coloană, zona de lipire, fereastra „Despre").

## Confidențialitate și rețea

- Aplicația nu folosește `localStorage`, `sessionStorage` sau IndexedDB și nu face cereri de rețea (fără `fetch`, CDN sau scripturi externe). Datele încărcate sunt prelucrate în memorie și dispar la reîncărcare, în afară de ce salvezi tu prin exporturi.
- Conține doar link-uri, deschise la click, către Buy Me a Coffee și chiuta.github.io.

## Rulare locală / offline

Descarcă `index.html` și deschide-l în browser; nu are nevoie de internet.

## Istoric / Changelog

### 8.1.0 — 2026-10-27
- Import Excel (`.xlsx`/`.xlsm`, prima foaie vizibilă) cu un cititor compact, fără dependențe.
- Test de performanță `tests/perf.test.mjs` cu cifre orientative în README; cale rapidă la parsarea numerelor.
- Nefăcut: Parquet (planificat), Web Worker / streaming (planificat), vechiul `.xls`.
- Existent deja: exportul graficelor în SVG/PNG. Test nou: `tests/xlsx.test.mjs`.

### 8.0.0 — 2026-10-26

- **Caiet reproductibil** (fila nouă „Caiet”): fiecare filtru, „Elimină duplicate”, „Curăță spații”, coloană calculată, schimbare de tip, ascundere/ordine de coloane, sortare și pivot se înregistrează ca pas. Pașii se pot dezactiva, reordona, edita (valoarea filtrului, formula) și șterge, cu re-rulare imediată pe datele încărcate.
- **Aplică pe alt fișier…**: pașii se re-rulează pe alt CSV/TSV/JSON (coloanele se potrivesc după nume; pașii care nu se aplică sunt săriți explicați). **Export/import caiet `.json`** (fără date), **export script JS** (Node 18+, fără dependențe: conține chiar funcțiile aplicației, deci dă același CSV; pivotul merge într-un al doilea CSV) și **export SQL** (lanț de CTE-uri, PostgreSQL/standard; formulele fără echivalent SQL sunt marcate TODO).
- Corecție: exporturile CSV ale aplicației începeau cu `BOM` + virgulă (antet cu o coloană goală în față); acum doar cu `BOM`. „Elimină duplicate” păstrează acum și sursa brută aliniată (schimbarea tipului după deduplicare dădea valori greșite).
- Limite: nu există joncțiuni între fișiere; textul fișierului încărcat rămâne în memoria paginii pentru re-rulare (nu se salvează).

- 7.3.5 — 2026-10-22: fff-kit 1.1.4: ținte tactile și text minim
- 7.3.4 — 2026-10-22: fff-kit 1.1.2: PBKDF2 600 000 iterații, protecție anti-clickjacking
- 7.3.2 — 2026-10-22: **remediere**: seturile demonstrative, butoanele de exemplu, exemplul de lipire, contoarele goale de rânduri/coloane și etichetele selectorului de limbă urmează acum limba aleasă.
- 7.3.1 — 2026-10-22: **remediere**: titlul paginii urmează acum limba aleasă.
### 7.3.3 — 2026-10-22
- Indicator „Date în memorie” lângă informațiile fișierului (dimensiunea textului încărcat; memoria JS a filei în tooltip, când browserul o raportează), avertisment pentru fișiere peste 50 MB și mesaj dacă citirea fișierului eșuează.
- Mobil: niciun text sub 12 px și ținte tactile de cel puțin 24 px (WCAG 2.5.8).

### 7.2.0 — 14 octombrie 2026
- Căutare în tabel după relevanță (FFF.search), cu păstrarea sortării manuale.
- „Date personale”: scanare locală și export CSV mascat (FFF.pii).
- Module comune core, label, bundle, search, pii; teste noi: `tests/fff-r8.test.mjs`.

### 7.1.4 — 12 octombrie 2026
- Versiunea și data ultimei actualizări sunt afișate în aplicație (subsol).

### 7.1.3 — 11 octombrie 2026
- Setul demonstrativ Iris conține acum cele 150 de rânduri clasice (înainte 20).
- Sortarea se declanșează de la click oriunde pe celula antetului (nu doar pe nume), are `aria-sort` și funcționează de la tastatură; selectorul de tip nu sortează.
- Corecție la asimetrie (skewness): formula ajustată folosește acum abaterea standard a populației în standardizare (verificată față de scipy `skew(bias=False)`).
- Abaterea standard este etichetată „(n−1)” (eșantion) în toate cele 7 limbi.
- CSP: `connect-src 'none'` (aplicația nu face nicio cerere de rețea).

### 7.1.2 — 11 octombrie 2026
- Securitate: coloana calculată folosește un evaluator propriu de expresii (fără `eval`/`new Function`); politica CSP nu mai conține `'unsafe-eval'` și `'unsafe-inline'` pentru scripturi (script-src pe hash SHA-256), iar `worker-src` este `'none'`. Comportamentul formulelor existente este identic (verificat pe 25 de expresii).
- Formule: funcții noi `floor`, `ceil`, `exp`, `log10`, `sin`, `cos`, constanta `pi` și operatorul ternar `a>b?x:y`, cu indiciu actualizat în toate cele 7 limbi.
- Accesibilitate: filele sunt acum navigabile de la tastatură (Tab, săgeți, Home/End, Enter/Spațiu), cu roluri ARIA `tablist`/`tab`/`tabpanel`.
- Tipărire: stil de tipărire care păstrează doar panoul activ.

### 7.1.1 — 11 octombrie 2026
- Accesibilitate: titlu h1, zonă principală (main), etichete pentru selectorul de limbă și butonul de temă, regiune de stare pentru notificări; verificare axe fără încălcări.
- Fila Corelații: legendă explicativă și cea mai puternică pereche de coloane, în toate cele 7 limbi.
- Actualizare versiune la v7.1.1.

## Licență

MIT — vezi fișierul LICENSE

## Autor

Alexio — Alexandru-Ionuț Chiuță, contact: alexio@trom.tf

## Rezumat

DataWeave este un atelier într-un singur fișier HTML pentru explorarea datelor CSV, TSV și JSON: tabel, statistici, grafice (bare, linii, dispersie, histogramă, box-plot, hartă termică, plăcintă, cu regresie și intervale de încredere), pivot și corelații. Sesiunile și rezultatele pot fi exportate. 7 limbi de interfață. Nu stochează nimic în browser și nu face cereri de rețea.
