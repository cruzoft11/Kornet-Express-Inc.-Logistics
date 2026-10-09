import { DatabaseSync } from 'node:sqlite';
const db = new DatabaseSync('./prisma/data/accounting.db');
// Check other companies with accounts
const companies = db.prepare("SELECT DISTINCT company_code, COUNT(*) as cnt FROM fs_accounts GROUP BY company_code").all();
console.log('Accounts by company:', JSON.stringify(companies));

// How many have specific key accounts
for (const co of companies) {
  const key = db.prepare("SELECT COUNT(*) as cnt FROM fs_accounts WHERE company_code=? AND acct_code IN ('1123','1130','2112','4210','4215')").get(co.company_code);
  console.log(co.company_code + ' has key logistics accounts:', key.cnt, '/5');
}
