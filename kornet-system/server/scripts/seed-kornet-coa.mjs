import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

const dbPath = resolve('prisma/data/accounting.db');
const db = new DatabaseSync(dbPath);
const company = 'KORNET';

// Full Kornet Express chart of accounts
// [acct_code, acct_desc, formula(DC=debit-normal/CD=credit-normal), gl_report]
const coa = [
  // ASSETS
  ['1110','BDO CHECKING ACCOUNT','DC','BAC'],
  ['1111','METROBANK CHECKING ACCOUNT','DC','BAC'],
  ['1112','BPI SAVINGS ACCOUNT','DC','BAC'],
  ['1113','PETTY CASH FUND','DC','BAC'],
  ['1114','CASH ON HAND','DC','BAC'],
  ['1115','LANDBANK SAVINGS ACCOUNT','DC','BAC'],
  ['1120','ACCOUNTS RECEIVABLE - TRADE','DC','BAC'],
  ['1123','ACCOUNTS RECEIVABLE - CLIENTS','DC','BAC'],
  ['1125','NOTES RECEIVABLE','DC','BAC'],
  ['1128','CWT RECEIVABLE (2307)','DC','BAC'],
  ['1130','ADVANCES TO CLIENTS (REIMBURSABLE)','DC','BAC'],
  ['1131','DUE FROM AGENTS','DC','BAC'],
  ['1135','PREPAID EXPENSES','DC','BAC'],
  ['1140','INPUT VAT','DC','BAC'],
  ['1142','INPUT VAT - PURCHASES','DC','BAC'],
  ['1150','OFFICE SUPPLIES INVENTORY','DC','BAC'],
  ['1160','OTHER CURRENT ASSETS','DC','BAC'],
  ['1200','PROPERTY & EQUIPMENT - NET','DC','BAC'],
  ['1210','TRANSPORTATION EQUIPMENT','DC','BAC'],
  ['1220','OFFICE EQUIPMENT','DC','BAC'],
  ['1230','FURNITURE & FIXTURES','DC','BAC'],
  ['1290','ACCUMULATED DEPRECIATION','CD','BAC'],
  ['1300','OTHER NON-CURRENT ASSETS','DC','BAC'],
  // LIABILITIES
  ['2100','ACCOUNTS PAYABLE - TRADE','CD','BLCC'],
  ['2112','ACCOUNTS PAYABLE - VENDORS','CD','BLCC'],
  ['2115','ACCRUED LIABILITIES','CD','BLCC'],
  ['2116','DUE TO AGENTS','CD','BLCC'],
  ['2117','CUSTOMER DEPOSITS','CD','BLCC'],
  ['2120','OUTPUT VAT','CD','BLCC'],
  ['2122','OUTPUT VAT PAYABLE','CD','BLCC'],
  ['2125','VAT PAYABLE','CD','BLCC'],
  ['2130','WITHHOLDING TAX PAYABLE','CD','BLCC'],
  ['2135','SSS PAYABLE','CD','BLCC'],
  ['2136','PHILHEALTH PAYABLE','CD','BLCC'],
  ['2137','PAG-IBIG PAYABLE','CD','BLCC'],
  ['2150','INCOME TAX PAYABLE','CD','BLCC'],
  ['2160','SHORT-TERM LOANS PAYABLE','CD','BLCC'],
  ['2166','EWT PAYABLE - 2%','CD','BLCC'],
  ['2170','OTHER CURRENT LIABILITIES','CD','BLCC'],
  ['2300','LONG-TERM DEBT','CD','BLCC'],
  // EQUITY
  ['3100','SHARE CAPITAL','CD','BAL'],
  ['3200','RETAINED EARNINGS','CD','BAL'],
  ['3300','CURRENT YEAR EARNINGS','CD','BAL'],
  // REVENUE
  ['4100','SERVICE REVENUE - GENERAL','CD','IS'],
  ['4200','FREIGHT FORWARDING REVENUE','CD','IS'],
  ['4210','OCEAN FREIGHT REVENUE','CD','IS'],
  ['4211','AIR FREIGHT REVENUE','CD','IS'],
  ['4212','BROKERAGE / CUSTOMS SERVICE FEES','CD','IS'],
  ['4213','TRUCKING & DELIVERY REVENUE','CD','IS'],
  ['4214','WAREHOUSING & STORAGE REVENUE','CD','IS'],
  ['4215','DOCUMENTATION & HANDLING FEES','CD','IS'],
  ['4216','VEHICLE HANDLING REVENUE','CD','IS'],
  ['4300','OTHER INCOME','CD','IS'],
  ['4303','FOREIGN EXCHANGE GAIN/LOSS','CD','IS'],
  ['4310','INTEREST INCOME','CD','IS'],
  // COST OF SERVICES
  ['4500','COST OF SERVICES','DC','IS'],
  ['4510','COST OF OCEAN FREIGHT','DC','IS'],
  ['4511','COST OF AIR FREIGHT','DC','IS'],
  ['4512','COST OF BROKERAGE & PORT CHARGES','DC','IS'],
  ['4513','COST OF TRUCKING','DC','IS'],
  ['4514','COST OF WAREHOUSING','DC','IS'],
  ['4515','COST OF HANDLING & DOCS','DC','IS'],
  ['4516','COST OF VEHICLE HANDLING','DC','IS'],
  // OPERATING EXPENSES
  ['5100','SALARIES & WAGES','DC','IS'],
  ['5110','SSS/PHILHEALTH/PAG-IBIG CONTRIBUTION','DC','IS'],
  ['5120','13TH MONTH PAY','DC','IS'],
  ['5200','RENT EXPENSE','DC','IS'],
  ['5210','UTILITIES EXPENSE','DC','IS'],
  ['5220','COMMUNICATION EXPENSE','DC','IS'],
  ['5300','OFFICE SUPPLIES EXPENSE','DC','IS'],
  ['5310','TRANSPORTATION & TRAVEL','DC','IS'],
  ['5320','REPRESENTATION & ENTERTAINMENT','DC','IS'],
  ['5400','DEPRECIATION EXPENSE','DC','IS'],
  ['5500','PROFESSIONAL FEES','DC','IS'],
  ['5510','LEGAL & ACCOUNTING FEES','DC','IS'],
  ['5600','TAXES & LICENSES','DC','IS'],
  ['5700','INTEREST EXPENSE','DC','IS'],
  ['5800','MISCELLANEOUS EXPENSE','DC','IS'],
  ['5900','OTHER OPERATING EXPENSES','DC','IS'],
];

db.exec('BEGIN IMMEDIATE');
let inserted = 0;
let updated = 0;
for (const [code, desc, formula, report] of coa) {
  const existing = db.prepare('SELECT Id FROM fs_accounts WHERE company_code=? AND acct_code=?').get(company, code);
  if (!existing) {
    db.prepare(`INSERT INTO fs_accounts (acct_code,acct_desc,acct_type,group_code,sub_group,formula,open_bal,cur_debit,cur_credit,end_bal,gl_report,gl_effect,schedule,initialize,is_active,company_code,created_at,updated_at)
      VALUES (?,?,?,?,?,?,0,0,0,0,?,?,?,?,1,?,datetime('now'),datetime('now'))`)
      .run(code, desc, 'OPERATING', '', '', formula, report, 'DIRECT', '', '', company);
    inserted++;
  } else {
    db.prepare(`UPDATE fs_accounts SET acct_desc=?,formula=?,gl_report=?,is_active=1,updated_at=datetime('now') WHERE company_code=? AND acct_code=?`)
      .run(desc, formula, report, company, code);
    updated++;
  }
}
db.exec('COMMIT');
console.log(`Done. Inserted: ${inserted}, Updated: ${updated}`);

// Verify key accounts
const check = db.prepare("SELECT COUNT(*) as cnt FROM fs_accounts WHERE company_code='KORNET' AND is_active=1").get();
console.log('Total active KORNET accounts:', check.cnt);

db.close();
