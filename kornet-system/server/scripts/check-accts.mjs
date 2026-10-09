import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('./prisma/data/accounting.db');

// Check fs_accounts columns
const acctCols = db.prepare("PRAGMA table_info(fs_accounts)").all();
console.log('fs_accounts columns:', acctCols.map(c => c.name).join(', '));

// Check fs_sys_id (period)
const sysCols = db.prepare("PRAGMA table_info(fs_sys_id)").all();
console.log('fs_sys_id columns:', sysCols.map(c => c.name).join(', '));

// Check periods for KORNET
const sys = db.prepare("SELECT * FROM fs_sys_id WHERE company_code = 'KORNET'").all();
console.log('KORNET sys_id rows:', sys.length);
for (const r of sys) console.log(' ', JSON.stringify(r));

// Check accounts
const accts = db.prepare("SELECT COUNT(*) as cnt FROM fs_accounts WHERE company_code = 'KORNET'").get();
console.log('KORNET accounts total:', accts.cnt);

// Check specific accounts by acct_code
const sample = db.prepare("SELECT * FROM fs_accounts WHERE company_code = 'KORNET' LIMIT 3").all();
console.log('Sample accounts:', JSON.stringify(sample, null, 2));
