import sqlite3, os

for root, dirs, files in os.walk(r'd:\DOWNLOADS\Accounting System'):
    for f in files:
        if f.endswith('.db') and 'azure' in f or 'recovered' in f or 'accounting_' in f:
            p = os.path.join(root, f)
            try:
                conn = sqlite3.connect(p)
                cur = conn.cursor()
                # Check for table names
                tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
                if any('bank' in t.lower() for t in tables):
                    print(p, 'has bank table!')
                    for t in tables:
                        if 'bank' in t.lower() or 'account' in t.lower():
                            c = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
                            print(f'  {t}: {c} rows')
                conn.close()
            except Exception:
                pass
