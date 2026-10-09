import { DatabaseSync } from 'node:sqlite';
const dbPath = './prisma/data/accounting.db';
const db = new DatabaseSync(dbPath);

// Check open periods
const periods = db.prepare("SELECT * FROM fs_period WHERE company_code = 'KORNET' ORDER BY period_date DESC LIMIT 5").all();
console.log('Periods:');
for (const p of periods) console.log(' ', JSON.stringify(p));

// Check accounts
const accts = db.prepare("SELECT COUNT(*) as cnt FROM fs_coa WHERE company_code = 'KORNET' AND is_active = 1").get();
console.log('Active accounts:', accts.cnt);

// Check specific accounts
for (const k of ['1110','1123','1128','1130','1142','2112','2117','2122','2166','4210','4211','4212','4213','4214','4215','4216','4510','4511','4512','4513','4514','4515']) {
  const a = db.prepare("SELECT acct_code, acct_desc, is_active FROM fs_coa WHERE company_code = 'KORNET' AND acct_code = ?").get(k);
  console.log(k + ':', a ? a.acct_desc.slice(0,40) + ' active=' + a.is_active : 'NOT FOUND');
}
