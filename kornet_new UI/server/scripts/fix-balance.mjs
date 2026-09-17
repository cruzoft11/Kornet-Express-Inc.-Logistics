import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../prisma/data/accounting.db');
const db = new DatabaseSync(dbPath);

db.prepare(`UPDATE fs_accounts SET cur_credit = '0.0' WHERE acct_code = '3150'`).run();

const rows = db.prepare(`SELECT acct_code, acct_desc, cur_debit, cur_credit FROM fs_accounts WHERE company_code = 'KORNET'`).all();
let totalDebits = 0;
let totalCredits = 0;
for (const r of rows) {
  totalDebits += parseFloat(r.cur_debit || 0);
  totalCredits += parseFloat(r.cur_credit || 0);
}

console.log(`TOTAL DEBITS:  PHP ${totalDebits.toFixed(2)}`);
console.log(`TOTAL CREDITS: PHP ${totalCredits.toFixed(2)}`);
console.log(`DIFFERENCE:    PHP ${(totalDebits - totalCredits).toFixed(2)}`);
console.log(`IS BALANCED:   ${Math.abs(totalDebits - totalCredits) < 0.01}`);
