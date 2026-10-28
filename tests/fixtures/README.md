# Fixture-uri .xls și .parquet

**Toate fișierele sunt SINTETICE** și au fost generate cu scriitori reali, dar **niciunul nu este produs de Microsoft Excel**, Spark, DuckDB, Hive sau alt sistem de producție, și niciunul nu a fost validat de terți. Valorile din teste sunt scrise de mână din datele sursă ale generatoarelor, nu din ieșirea aplicației.

## Seturi
### Mai vechi (8.2.0, generate o singură dată, fără script în depozit)
`book.xls`, `big.xls` (openpyxl .xlsx convertit cu LibreOffice „MS Excel 97”), `t_*.parquet`, `big_snappy.parquet`, `nested.parquet` (pyarrow 26). Folosite de `tests/xls-parquet.test.mjs`.

### Noi (8.2.1, tura 3, 2026-10-28)
Generate de scripturile din acest director, rulate în același venv (Python 3.13):
```
python3 -m venv v && v/bin/pip install xlwt==1.3.0 openpyxl==3.1.5 pyarrow==26.0.0 fastparquet==2026.9.0 pandas numpy
v/bin/python tests/fixtures/generate_xls.py tests/fixtures        # xlwt 1.3.0 + LibreOffice 24.2.7.2 (soffice --headless --convert-to "xls:MS Excel 97")
v/bin/python tests/fixtures/generate_parquet.py tests/fixtures    # pyarrow 26.0.0 + fastparquet 2026.9.0
```
Testul: `node tests/fixtures-real.test.mjs` (44 de verificări).

| Fișier | Scriitor | Ce acoperă |
|---|---|---|
| `xlwt_mixed.xls` | xlwt (BIFF8 nativ) | 3 foi (nume Unicode, una goală), celulă mergiută, RK (întregi și *100), float, limite 2^29/2^30/2^31, 1e10, 1e-7, dată / dată+oră, 1900-03-01, booleeni, Unicode (CJK, emoji), virgulă/ghilimele/linie nouă, șir de 300 car., rând rar |
| `xlwt_hidden_first.xls` | xlwt | prima foaie ascunsă |
| `xlwt_empty_first.xls`, `xlwt_all_empty.xls` | xlwt | prima foaie goală / toate goale |
| `xlwt_formula_cache_zero.xls` | xlwt | formule fără valoare în cache (xlwt nu calculează: scrie rezultat „gol”) |
| `xlwt_3000rows.xls` (≈500 KB) | xlwt | 3001 x 6, SST mare |
| `lo_calc.xls` | LibreOffice 24.2 din .xlsx openpyxl | formule cu valori în cache (număr, text, dată calculată), erori #DIV/0!/#NUM!, celule mergiute, 2 foi |
| `pa_types_{none,snappy,gzip,dict,v2}.parquet` | pyarrow | int8/16/32/64, uint32, float32/64, string, large_string, bool, date32, timestamp ms/us/UTC, binary, decimal(10,2), coloană doar-null, nuluri; plain/dicționar/pagini v2 |
| `pa_types_{zstd,lz4,brotli}.parquet` | pyarrow | codecuri neacceptate → mesaj dedicat |
| `pa_types_{delta,bss}.parquet` | pyarrow | DELTA_*/BYTE_STREAM_SPLIT neacceptate → mesaj dedicat |
| `pa_dictarrow_rg.parquet` | pyarrow | coloană dictionary arrow, 300 rânduri în 5 grupuri de rânduri |
| `pa_extremes.parquet` | pyarrow | uint8/16/32/64, limite int64/uint64, time32/64, float16, timestamp ns |
| `pa_int96.parquet` | pyarrow | timestamp INT96 |
| `pa_zero_rows.parquet`, `pa_one_column.parquet` | pyarrow | tabel gol / o coloană |
| `fp_{none,snappy,gzip}.parquet` | fastparquet | alt scriitor, 3 grupuri de rânduri, nuluri, datetime |

## Rezultate și limite constatate
- **Bug găsit și corectat (8.2.1):** întregii Parquet fără semn (uint32/uint64) se afișau cu semn.
- Limite documentate, neschimbate: timestamp µs/ns se trunchiază la ms; TIME (afișat ca întreg brut) și Float16 (hex) nu sunt formatate; binary este decodat ca text; prima foaie goală → eroare; ZSTD/LZ4/BROTLI/DELTA/BYTE_STREAM_SPLIT neacceptate (mesaj clar).
- Nu s-au putut testa fișiere reale din Excel; BIFF5/criptat rămân simulate (testul vechi).
