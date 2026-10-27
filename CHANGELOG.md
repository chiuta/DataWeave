# Jurnal de modificări — DataWeave

Format: [SemVer](https://semver.org/lang/ro/) (MAJOR.MINOR.PATCH). Istoricul complet al versiunilor anterioare este în secțiunea „Istoric / Changelog” din [README.ro.md](README.ro.md).

## 8.2.0 — 2026-10-27

### Adăugat
- Import `.xls` (Excel 97-2003, BIFF8) fără biblioteci: container OLE2 + înregistrări BIFF8 (prima foaie vizibilă, texte din SST inclusiv cu CONTINUE, numere, RK/MULRK, booleeni, valori în cache ale formulelor, date din formatele de număr, sistemele de date 1900/1904). Funcționează și la „Aplică pe alt fișier” din Caiet. Fișierele criptate cu parolă și BIFF2-5 primesc mesaje clare.
- Import Parquet `.parquet` fără biblioteci: tabele plate, pagini v1/v2, PLAIN + dicționar + RLE pentru booleeni, compresie necomprimat / SNAPPY / GZIP (GZIP prin `DecompressionStream`), tipuri bool, int32/int64 (exact), float/double, text, dată, timestamp, zecimal, INT96, nuluri. Pentru ZSTD/LZ4/BROTLI/LZO, codificări DELTA_*/BYTE_STREAM_SPLIT și coloane imbricate: mesaj clar cu numele codecului/codificării.
- Mesaje noi în cele 8 limbi (traducerile fr/it/es/pt/de/hu sunt automate, neverificate de vorbitori nativi).
- Test nou `tests/xls-parquet.test.mjs` (38 de verificări) cu fișiere de test în `tests/fixtures/`, generate cu LibreOffice (xls) și pyarrow 26 (parquet), adică nu cu codul aplicației.
- Refactorizare mică: scrierea CSV din grila Excel este comună (`gridCsv`).

### Nu s-a implementat / limite
- Testele `.xls` folosesc doar fișiere LibreOffice, nu fișiere scrise de Microsoft Excel; cazurile „criptat” și „BIFF5” sunt simulate prin modificarea unui octet (doar detecția). Parquet: verificat cu pyarrow, nu cu Spark/DuckDB/Hive; citirea necesită tot fișierul în memorie.
- Parquet: ZSTD/LZ4/BROTLI/LZO, DELTA_BINARY_PACKED / DELTA_(LENGTH_)BYTE_ARRAY / BYTE_STREAM_SPLIT, coloane imbricate, fișiere criptate; `.xls` BIFF2-5 și criptat; Web Worker / streaming (planificat).

### Observații
- Exportul graficelor în SVG și PNG („⬇ SVG” / „⬇ PNG”) exista deja; neschimbat.

## 8.1.0 — 2026-10-27

### Adăugat
- Import Excel `.xlsx` / `.xlsm`: cititor compact fără biblioteci (ZIP cu `DecompressionStream`, XML cu `DOMParser`), prima foaie vizibilă, valori în cache ale formulelor, date calendaristice din stiluri, rânduri goale omise. Funcționează și la „Aplică pe alt fișier” din Caiet.
- Mesaje clare pentru `.xls` vechi și pentru fișiere Excel ilizibile.
- Test de performanță `tests/perf.test.mjs` (CSV sintetic, 50 000 - 500 000 de rânduri) și cifre orientative în README.
- Cale rapidă în `parseMaybeNumber` (rezultate identice, verificat pe 9 000 de șiruri).
- Texte noi în cele 8 limbi (traducerile fr/it/es/pt/de/hu sunt automate, neverificate de vorbitori nativi).
- Teste noi: `tests/xlsx.test.mjs` (22 de verificări), `tests/perf.test.mjs`.

### Nu s-a implementat
- Parquet: ar necesita decodare Thrift + Snappy; marcat „planificat”.
- Web Worker / streaming: parsarea rămâne pe firul principal; marcat „planificat”.
- `.xls` vechi (BIFF) și fișiere Excel protejate cu parolă.

### Observații
- Exportul graficelor în SVG/PNG exista deja.
- Timpii din test au fost măsurați pe un container foarte încărcat; repetă pe propriul calculator.

## 8.0.0 — 2026-10-26

Versiunea anterioară; vezi README.ro.md.
