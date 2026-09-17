import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../prisma/data/accounting.db');
const db = new DatabaseSync(dbPath);

const rows = db.prepare(`SELECT acct_code, acct_desc, cur_debit, cur_credit FROM fs_accounts WHERE company_code = 'KORNET'`).all();

let rev = 0;
let exp = 0;
for (const r of rows) {
  const code = parseInt(r.acct_code, 10);
  const d = parseFloat(r.cur_debit || 0);
  const c = parseFloat(r.cur_credit || 0);
  if (code >= 4000 && code < 4500) {
    rev += (c - d);
  } else if (code >= 4500 && code < 6000) {
    exp += (d - c);
  }
}
console.log(`Total Revenues: PHP ${rev.toFixed(2)}`);
console.log(`Total Expenses: PHP ${exp.toFixed(2)}`);
console.log(`Net Income (Rev - Exp): PHP ${(rev - exp).toFixed(2)}`);

const acct3150 = db.prepare(`SELECT * FROM fs_accounts WHERE acct_code = '3150' AND company_code = 'KORNET'`).get();
console.log('Account 3150:', acct3150);
