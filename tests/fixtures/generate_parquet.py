#!/usr/bin/env python3
"""Generează .parquet SINTETICE cu pyarrow 26.0.0 și fastparquet 2026.9.0 (două scriitori independenți).
Rulare: python3 tests/fixtures/generate_parquet.py tests/fixtures"""
import sys, os, datetime as dt, decimal
import pyarrow as pa, pyarrow.parquet as pq, fastparquet, pandas as pd, numpy as np
out = sys.argv[1] if len(sys.argv) > 1 else 'tests/fixtures'
os.makedirs(out, exist_ok=True)

# tipuri variate (pyarrow): int8/16/32/64, uint32, float/double, string, large_string, bool, date32, date64, timestamp (s/ms/us/ns), time32/64, binary, decimal, null-uri, coloană doar-null
n = 5
t = pa.table({
  'i8': pa.array([1, -2, None, 127, -128], pa.int8()),
  'i16': pa.array([300, None, -300, 0, 32767], pa.int16()),
  'i32': pa.array([1, 2, 3, None, -2147483648], pa.int32()),
  'i64': pa.array([2**40, -2**40, None, 0, 9007199254740991], pa.int64()),
  'u32': pa.array([0, 4294967295, 1, None, 7], pa.uint32()),
  'f32': pa.array([0.1, 2.5, None, -1.0, 3.4e38], pa.float32()),
  'f64': pa.array([0.1, 1e300, None, -0.0, 3.141592653589793], pa.float64()),
  'str': pa.array(['Ana', 'Dăniță ✓', None, '', 'a,b"c\nd'], pa.string()),
  'lstr': pa.array(['x', 'y', 'z', None, 'ț'], pa.large_string()),
  'bool': pa.array([True, False, None, True, False], pa.bool_()),
  'd32': pa.array([dt.date(2024, 3, 15), dt.date(1970, 1, 1), None, dt.date(1900, 1, 1), dt.date(2999, 12, 31)], pa.date32()),
  'ts_ms': pa.array([dt.datetime(2024, 3, 15, 10, 30, 5, 123000), None, dt.datetime(1970, 1, 1), dt.datetime(1969, 12, 31, 23, 59, 59), dt.datetime(2100, 1, 1)], pa.timestamp('ms')),
  'ts_us': pa.array([dt.datetime(2024, 3, 15, 10, 30, 5, 123456), None, dt.datetime(1970, 1, 1), dt.datetime(1969, 12, 31, 23, 59, 59), dt.datetime(2100, 1, 1)], pa.timestamp('us')),
  'ts_utc': pa.array([dt.datetime(2024, 3, 15, 10, 30, 5), None, dt.datetime(1970, 1, 1), dt.datetime(2000, 1, 1), dt.datetime(2100, 1, 1)], pa.timestamp('us', tz='UTC')),
  'bin': pa.array([b'abc', b'', None, b'\x00\xff', b'z'], pa.binary()),
  'dec': pa.array([decimal.Decimal('12.34'), decimal.Decimal('-0.05'), None, decimal.Decimal('1000.00'), decimal.Decimal('0.00')], pa.decimal128(10, 2)),
  'allnull': pa.array([None] * n, pa.int64()),
})
for codec in ['NONE', 'SNAPPY', 'GZIP', 'ZSTD', 'LZ4', 'BROTLI']:
    pq.write_table(t, f'{out}/pa_types_{codec.lower()}.parquet', compression=codec, use_dictionary=False)
pq.write_table(t, f'{out}/pa_types_dict.parquet', compression='SNAPPY', use_dictionary=True)
pq.write_table(t, f'{out}/pa_types_v2.parquet', compression='GZIP', data_page_version='2.0')
pq.write_table(t, f'{out}/pa_types_delta.parquet', compression='SNAPPY', use_dictionary=False, column_encoding={'i64': 'DELTA_BINARY_PACKED', 'str': 'DELTA_BYTE_ARRAY'}, data_page_version='2.0')
pq.write_table(t, f'{out}/pa_types_bss.parquet', compression='NONE', use_dictionary=False, column_encoding={'f64': 'BYTE_STREAM_SPLIT', 'f32': 'BYTE_STREAM_SPLIT'})
# coloană categorică (dictionary arrow) și mai multe grupuri de rânduri
cat = pa.table({'cat': pa.array(['a', 'b', 'a', None, 'c', 'b'] * 50).dictionary_encode(), 'k': pa.array(range(300), pa.int32())})
pq.write_table(cat, f'{out}/pa_dictarrow_rg.parquet', compression='SNAPPY', row_group_size=70)
pq.write_table(pa.table({'a': pa.array([], pa.int64()), 'b': pa.array([], pa.string())}), f'{out}/pa_zero_rows.parquet')
pq.write_table(pa.table({'a': pa.array([1, 2, 3], pa.int32())}), f'{out}/pa_one_column.parquet', compression='NONE')

# extreme: întregi fără semn, limite int64/uint64, timp, float16, INT96
ex = pa.table({
  'u8': pa.array([0, 255, None], pa.uint8()), 'u16': pa.array([0, 65535, None], pa.uint16()),
  'u32': pa.array([0, 4294967295, 2147483648], pa.uint32()),
  'u64': pa.array([0, 2**64 - 1, 2**63], pa.uint64()), 'i64': pa.array([-2**63, 2**63 - 1, 2**53 + 1], pa.int64()),
  'tm32': pa.array([dt.time(1, 2, 3), None, dt.time(23, 59, 59)], pa.time32('s')), 'tm64': pa.array([dt.time(1, 2, 3, 456), None, dt.time(23, 59, 59, 999999)], pa.time64('us')),
  'f16': pa.array(np.array([0.5, 1.0, 2.0], dtype=np.float16)),
  'ts_ns': pa.array([1, 1700000000123456789, None], pa.timestamp('ns')),
})
pq.write_table(ex, f'{out}/pa_extremes.parquet', compression='SNAPPY', use_dictionary=False)
pq.write_table(pa.table({'ts': pa.array([dt.datetime(2024, 3, 15, 10, 30, 5, 123000), None, dt.datetime(1999, 12, 31, 23, 59, 59)], pa.timestamp('ns'))}), f'{out}/pa_int96.parquet', use_deprecated_int96_timestamps=True)

# fastparquet (alt scriitor)
df = pd.DataFrame({'id': np.arange(7, dtype='int64'), 'x': [0.5, 1.5, np.nan, 3.5, 4.5, 5.5, 6.5], 's': ['a', 'ă', None, 'd', 'e', 'f', 'g'],
                   'b': [True, False, True, True, False, True, False], 'd': pd.to_datetime(['2024-01-01', '2024-01-02 03:04:05', None, '2000-01-01', '2024-01-05', '2024-01-06', '2024-01-07'], format='ISO8601')})
for comp in ['SNAPPY', 'GZIP', None]:
    fastparquet.write(f'{out}/fp_{(comp or "none").lower()}.parquet', df, compression=comp, row_group_offsets=[0, 3, 5])
print('ok', pa.__version__, fastparquet.__version__)
