import sqlite3

conn = sqlite3.connect('server/prisma/data/kornet.db')
tables = [r[0] for r in conn.execute('SELECT name FROM sqlite_master WHERE type="table"').fetchall()]
print('kornet.db tables:', tables)

for t in ['CheckDisbursement', 'BridgeItem', 'Shipment', 'BillingCode']:
    if t in tables:
        count = conn.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]
        print(f'{t} count: {count}')
        rows = conn.execute(f'SELECT * FROM {t} LIMIT 2').fetchall()
        print(f'{t} sample: {rows}')
conn.close()
