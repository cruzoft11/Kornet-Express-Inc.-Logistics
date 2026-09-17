import sqlite3

for p in ['../../DB to check/accounting_live_current.db', '../../web-system/server/AccountingApi/accounting_v11.db']:
    conn = sqlite3.connect(p)
    cur = conn.cursor()
    print('=== ' + p + ' ===')
    if 'fs_sys_id' in [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]:
        rows = cur.execute('SELECT * FROM fs_sys_id').fetchall()
        print('fs_sys_id:', rows)
    if 'fs_banks' in [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]:
        rows = cur.execute('SELECT * FROM fs_banks LIMIT 5').fetchall()
        print('fs_banks:', rows)
    conn.close()
