import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { existsSync } from 'node:fs';

const dbPath = process.env.ACCOUNTING_DB_PATH || path.resolve('prisma/data/accounting.db');
if (!existsSync(dbPath)) throw new Error(`accounting db not found: ${dbPath}`);
const db = new DatabaseSync(dbPath);
const company = 'KORNET';
const accounts = [
  ['1130','ADVANCES TO CLIENTS','DC','BAC'], ['1131','DUE FROM AGENTS','DC','BAC'], ['2116','DUE TO AGENTS','CD','BLCC'], ['2117','CUSTOMER DEPOSITS','CD','BLCC'],
  ['4210','OCEAN FREIGHT REVENUE','CD','IS'], ['4211','AIR FREIGHT REVENUE','CD','IS'], ['4212','BROKERAGE / CUSTOMS SERVICE FEES','CD','IS'], ['4213','TRUCKING & DELIVERY REVENUE','CD','IS'], ['4214','WAREHOUSING & STORAGE REVENUE','CD','IS'], ['4215','DOCUMENTATION & HANDLING FEES','CD','IS'], ['4216','VEHICLE HANDLING REVENUE','CD','IS'],
  ['4510','COST OF OCEAN FREIGHT','DC','IS'], ['4511','COST OF AIR FREIGHT','DC','IS'], ['4512','COST OF BROKERAGE & PORT CHARGES','DC','IS'], ['4513','COST OF TRUCKING','DC','IS'], ['4514','COST OF WAREHOUSING','DC','IS'], ['4515','COST OF HANDLING & DOCS','DC','IS'], ['4303','FOREIGN EXCHANGE GAIN/LOSS','CD','IS'],
];
let inserted = 0;
db.exec('BEGIN IMMEDIATE');
try {
  for (const [code, desc, formula, report] of accounts) {
    const found = db.prepare('SELECT 1 FROM fs_accounts WHERE company_code=? AND acct_code=?').get(company, code);
    if (!found) {
      db.prepare(`INSERT INTO fs_accounts (acct_code,acct_desc,acct_type,group_code,sub_group,formula,open_bal,cur_debit,cur_credit,end_bal,gl_report,gl_effect,schedule,initialize,is_active,company_code,created_at,updated_at)
        VALUES (?, ?, '', '', '', ?, 0, 0, 0, 0, ?, '', '', '', 1, ?, datetime('now'), datetime('now'))`).run(code, desc, formula, report, company);
      inserted++;
    }
  }
  const badMasters = db.prepare(`UPDATE fs_checkmas SET is_deleted=1, deleted_at=datetime('now') WHERE company_code=? AND (is_deleted IS NULL OR is_deleted=0) AND (j_ck_no LIKE 'CHK-8801%' OR j_jv_no LIKE '%8801%' OR j_ck_no IN (SELECT DISTINCT j_ck_no FROM fs_checkvou WHERE company_code=? AND acct_code NOT IN (SELECT acct_code FROM fs_accounts WHERE company_code=?)))`).run(company, company, company).changes;
  const badLines = db.prepare(`UPDATE fs_checkvou SET is_deleted=1, deleted_at=datetime('now') WHERE company_code=? AND (is_deleted IS NULL OR is_deleted=0) AND (acct_code NOT IN (SELECT acct_code FROM fs_accounts WHERE company_code=?) OR j_ck_no LIKE 'CHK-8801%')`).run(company, company).changes;
  const period = db.prepare('SELECT 1 FROM fs_sys_id WHERE company_code=?').get(company);
  let periodAction = 'kept';
  if (!period) {
    const now = new Date(); const y = now.getFullYear(); const m = now.getMonth()+1; const mm = String(m).padStart(2,'0'); const last = new Date(y,m,0).getDate();
    db.prepare(`INSERT INTO fs_sys_id (pres_mo,pres_yr,beg_date,end_date,updated_at,company_code) VALUES (?,?,?,?,datetime('now'),?)`).run(m,y,`${y}-${mm}-01 00:00:00`,`${y}-${mm}-${String(last).padStart(2,'0')} 00:00:00`,company);
    periodAction = 'created';
  }
  db.exec('COMMIT');
  console.log(JSON.stringify({ dbPath, insertedAccounts: inserted, softDeletedMasters: badMasters, softDeletedLines: badLines, period: periodAction }, null, 2));
} catch (e) { db.exec('ROLLBACK'); throw e; } finally { db.close(); }
