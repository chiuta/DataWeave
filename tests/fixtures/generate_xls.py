#!/usr/bin/env python3
"""Generează .xls BIFF8 SINTETICE cu xlwt 1.3.0 (scriitor nativ BIFF8) și cu LibreOffice (conversie din .xlsx creat cu openpyxl).
NU sunt produse de Microsoft Excel. Rulare: python3 tests/fixtures/generate_xls.py tests/fixtures"""
import sys, os, datetime, subprocess, tempfile, shutil
import xlwt, openpyxl
out = sys.argv[1] if len(sys.argv) > 1 else 'tests/fixtures'
os.makedirs(out, exist_ok=True)
dfmt = xlwt.easyxf(num_format_str='YYYY-MM-DD'); tfmt = xlwt.easyxf(num_format_str='YYYY-MM-DD HH:MM:SS')

# 1) xlwt_mixed.xls: RK (întregi, *100), float, negative, limite RK, dată, boolean, Unicode, șir lung, celule mergiute, 3 foi
wb = xlwt.Workbook(encoding='utf-8')
ws = wb.add_sheet('Mixt ă')
ws.write_merge(0, 0, 0, 2, 'Titlu mergiut ăîșț')          # A1:C1 mergiut, valoarea doar în A1
for j, h in enumerate(['id', 'valoare', 'text', 'data', 'activ']): ws.write(1, j, h)
rows = [
 (1, 0.01, 'Ana', datetime.date(2024, 3, 15), True),
 (-5, 1234567.89, 'Dăniță ✓ 日本語', datetime.datetime(2023, 12, 1, 8, 5, 30), False),
 (536870911, 1e10, 'cu, virgulă', datetime.date(1999, 12, 31), True),
 (1073741823, -0.5, 'ghilimele "x"', datetime.date(2025, 1, 31), False),
 (2147483647, 3.141592653589793, 'linie\nnouă', datetime.date(1900, 3, 1), True),
 (0, 1e-7, '😀 emoji', datetime.date(2024, 2, 29), False),
]
for i, (a, b, c, d, e) in enumerate(rows):
    r = 2 + i
    ws.write(r, 0, a); ws.write(r, 1, b); ws.write(r, 2, c)
    ws.write(r, 3, d, tfmt if isinstance(d, datetime.datetime) else dfmt); ws.write(r, 4, e)
ws.write(8, 0, 'x' * 300)                                  # șir lung (300)
ws.write(9, 2, 'doar C10')                                 # rând rar
wb.add_sheet('Gol')                                         # foaie goală
ws3 = wb.add_sheet('Foaia ț 3'); ws3.write(0, 0, 'a'); ws3.write(0, 1, 'b')
wb.save(out + '/xlwt_mixed.xls')

# 2) prima foaie goală, a doua cu date (cum alege aplicația foaia?)
wb = xlwt.Workbook(encoding='utf-8'); wb.add_sheet('Goala'); w2 = wb.add_sheet('Date'); w2.write(0, 0, 'k'); w2.write(0, 1, 'v'); w2.write(1, 0, 'a'); w2.write(1, 1, 1)
wb.save(out + '/xlwt_empty_first.xls')

# 3) prima foaie ascunsă
wb = xlwt.Workbook(encoding='utf-8'); h = wb.add_sheet('Ascunsa'); h.write(0, 0, 'ascuns'); h.visibility = 1
v = wb.add_sheet('Vizibila'); v.write(0, 0, 'k'); v.write(1, 0, 'vizibil')
wb.save(out + '/xlwt_hidden_first.xls')

# 4) toate foile goale
wb = xlwt.Workbook(encoding='utf-8'); wb.add_sheet('A'); wb.add_sheet('B'); wb.save(out + '/xlwt_all_empty.xls')

# 5) formule (xlwt scrie rezultatul în cache ca 0 — fixture pentru „formula citită din cache”, NU pentru valoarea reală)
wb = xlwt.Workbook(encoding='utf-8'); f = wb.add_sheet('F'); f.write(0, 0, 2); f.write(0, 1, 3); f.write(0, 2, xlwt.Formula('A1*B1')); f.write(1, 0, 'x'); f.write(1, 1, xlwt.Formula('A2&"y"'))
wb.save(out + '/xlwt_formula_cache_zero.xls')

# 6) 3000 de rânduri x 6 coloane (SST mare + multe înregistrări; ~100 KB)
wb = xlwt.Workbook(encoding='utf-8'); b = wb.add_sheet('Mare')
for j in range(6): b.write(0, j, 'c%d' % j)
for i in range(1, 3001):
    for j in range(6): b.write(i, j, ('t%d_%d ă' % (i, j)) if j % 2 == 0 else (i * 10 + j) / 4)
wb.save(out + '/xlwt_3000rows.xls')

# 7) LibreOffice: formule cu valori în cache (inclusiv text, eroare), celule mergiute, 2 foi, date
t = tempfile.mkdtemp()
x = openpyxl.Workbook(); s = x.active; s.title = 'Calcule'
s.append(['a', 'b', 'suma', 'text', 'data', 'eroare', 'proc'])
s.append([2, 3, '=A2+B2', '=CONCATENATE("n=",A2)', datetime.date(2024, 5, 17), '=1/0', '=A2/B2'])
s.append([10, 4, '=A3+B3', '=UPPER("ăbc")', '=E2+30', '=SQRT(-1)', '=A3/B3'])
s.merge_cells('A5:C5'); s['A5'] = 'mergiut'
s2 = x.create_sheet('Alta'); s2.append(['z']); s2.append([1])
x.save(t + '/lo_calc.xlsx')
subprocess.run(['soffice', '--headless', '--convert-to', 'xls:MS Excel 97', '--outdir', t, t + '/lo_calc.xlsx'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
shutil.copy(t + '/lo_calc.xls', out + '/lo_calc.xls')
print('ok', xlwt.__VERSION__, openpyxl.__version__)
