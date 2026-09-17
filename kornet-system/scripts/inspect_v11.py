import sqlite3

conn = sqlite3.connect('../../web-system/server/AccountingApi/accounting_v11.db')
cur = conn.cursor()
tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print('accounting_v11.db tables:', tables)

for t in ['fs_accounts', 'fs_banks', 'fs_checkmas', 'fs_checkvou', 'fs_acheckma', 'fs_acheckvo', 'fs_journals', 'fs_pournals', 'fs_supplier']:
    if t in tables:
        c = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        print(f'{t}: {c} rows')
        cols = [col[1] for col in cur.execute(f"PRAGMA table_info({t})").fetchall()]
        print(f'  columns: {cols}')
conn.close()
