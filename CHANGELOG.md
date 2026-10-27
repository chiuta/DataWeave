# Jurnal de modificări — DataWeave

Format: [SemVer](https://semver.org/lang/ro/) (MAJOR.MINOR.PATCH). Istoricul complet al versiunilor anterioare este în secțiunea „Istoric / Changelog” din [README.ro.md](README.ro.md).

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
