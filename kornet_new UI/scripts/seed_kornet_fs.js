import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../server/prisma/data/accounting.db');
const db = new DatabaseSync(dbPath);

console.log('Seeding KORNET in accounting.db at:', dbPath);

// Check if KORNET has accounts
const kornetAccts = db.prepare("SELECT COUNT(*) as c FROM fs_accounts WHERE company_code = 'KORNET'").get().c;
if (kornetAccts === 0) {
  console.log('Seeding KORNET accounts from gian...');
  db.exec(`INSERT INTO fs_accounts (acct_code, acct_desc, acct_type, group_code, sub_group, formula, open_bal, cur_debit, cur_credit, end_bal, gl_report, gl_effect, schedule, initialize, is_active, legacy_row_hash, created_at, updated_at, company_code) 
           SELECT acct_code, acct_desc, acct_type, group_code, sub_group, formula, open_bal, cur_debit, cur_credit, end_bal, gl_report, gl_effect, schedule, initialize, is_active, legacy_row_hash, datetime('now'), datetime('now'), 'KORNET' 
           FROM fs_accounts WHERE company_code = 'gian'`);
}

// Check if KORNET has sys_id
const kornetSys = db.prepare("SELECT COUNT(*) as c FROM fs_sys_id WHERE company_code = 'KORNET'").get().c;
if (kornetSys === 0) {
  console.log('Seeding KORNET sys_id...');
  db.exec(`INSERT INTO fs_sys_id (pres_mo, pres_yr, beg_date, end_date, updated_at, company_code) 
           VALUES (9, 2026, '2026-09-01 00:00:00', '2026-09-30 00:00:00', datetime('now'), 'KORNET')`);
}

// Check if KORNET has banks
const kornetBanks = db.prepare("SELECT COUNT(*) as c FROM fs_banks WHERE company_code = 'KORNET'").get().c;
if (kornetBanks === 0) {
  console.log('Seeding KORNET banks...');
  db.exec(`INSERT INTO fs_banks (bank_no, bank_name, bank_addr, bank_acct, company_code) VALUES 
           (1, 'BDO Unibank (Parañaque Branch)', 'Ninoy Aquino Ave, Parañaque', '0012-3456-7890', 'KORNET'), 
           (2, 'Metrobank (NAIA Cargo Branch)', 'Domestic Road, Pasay City', '0289-9876-5432', 'KORNET'), 
           (3, 'Bank of the Philippine Islands (BPI)', 'Airport Road, Pasay', '1982-3451-09', 'KORNET')`);
}

// Check if KORNET has suppliers
const kornetSups = db.prepare("SELECT COUNT(*) as c FROM fs_supplier WHERE company_code = 'KORNET'").get().c;
if (kornetSups === 0) {
  console.log('Seeding KORNET suppliers...');
  db.exec(`INSERT INTO fs_supplier (sup_no, sup_name, sup_addr, sup_phone, sup_fax, sup_contak, company_code) VALUES 
           (1, 'Maersk Philippines Inc.', 'Manila Harbor Center, Tondo, Manila', '+63 2 8588 7777', '+63 2 8588 7700', 'Billing & Demurrage Dept', 'KORNET'), 
           (2, 'Philippine Airlines Cargo', 'PAL Cargo Terminal, NAIA Complex, Pasay City', '+63 2 8855 8888', null, 'Cargo Dispatch', 'KORNET'), 
           (3, 'Asian Terminals Inc. (ATI)', 'South Harbor, Port Area, Manila', '+63 2 8528 6000', null, 'Port Operations', 'KORNET'), 
           (4, 'International Container Terminal Services Inc. (ICTSI)', 'MICT South Access Rd, Manila', '+63 2 8245 4101', null, 'Terminal Billing', 'KORNET')`);
}

// Seed a few initial check masters for KORNET from template
const kornetChecks = db.prepare("SELECT COUNT(*) as c FROM fs_checkmas WHERE company_code = 'KORNET'").get().c;
if (kornetChecks === 0) {
  console.log('Seeding sample KORNET check vouchers...');
  db.exec(`INSERT INTO fs_checkmas (j_jv_no, j_ck_no, j_date, j_pay_to, j_ck_amt, j_desc, bank_no, sup_no, is_deleted, company_code, created_at, updated_at) VALUES 
           ('CDV-2026-001', 'CHK-880121', '2026-09-05', 'Maersk Philippines Inc.', 45500.00, 'Ocean Freight Settlement Booking BK-MNL-2026-0089', 1, 1, 0, 'KORNET', datetime('now'), datetime('now')),
           ('CDV-2026-002', 'CHK-880122', '2026-09-08', 'Asian Terminals Inc. (ATI)', 12850.00, 'Port Storage & Wharfage Clearance CT-8841', 1, 3, 0, 'KORNET', datetime('now'), datetime('now')),
           ('CDV-2026-003', 'CHK-880123', '2026-09-12', 'Philippine Airlines Cargo', 28300.00, 'Air Waybill Freight AWB-079-8812401', 2, 2, 0, 'KORNET', datetime('now'), datetime('now'))`);

  db.exec(`INSERT INTO fs_checkvou (j_ck_no, acct_code, j_ck_amt, j_d_or_c, is_deleted, company_code, created_at, updated_at) VALUES 
           ('CHK-880121', '5010', 45500.00, 'D', 0, 'KORNET', datetime('now'), datetime('now')),
           ('CHK-880121', '1010', 45500.00, 'C', 0, 'KORNET', datetime('now'), datetime('now')),
           ('CHK-880122', '5030', 12850.00, 'D', 0, 'KORNET', datetime('now'), datetime('now')),
           ('CHK-880122', '1010', 12850.00, 'C', 0, 'KORNET', datetime('now'), datetime('now')),
           ('CHK-880123', '5020', 28300.00, 'D', 0, 'KORNET', datetime('now'), datetime('now')),
           ('CHK-880123', '1020', 28300.00, 'C', 0, 'KORNET', datetime('now'), datetime('now'))`);
}

console.log('KORNET Accounts:', db.prepare("SELECT COUNT(*) as c FROM fs_accounts WHERE company_code = 'KORNET'").get().c);
console.log('KORNET SysId:', db.prepare("SELECT * FROM fs_sys_id WHERE company_code = 'KORNET'").get());
console.log('KORNET Banks:', db.prepare("SELECT COUNT(*) as c FROM fs_banks WHERE company_code = 'KORNET'").get().c);
console.log('KORNET Checks:', db.prepare("SELECT COUNT(*) as c FROM fs_checkmas WHERE company_code = 'KORNET'").get().c);
console.log('KORNET Check Lines:', db.prepare("SELECT COUNT(*) as c FROM fs_checkvou WHERE company_code = 'KORNET'").get().c);
console.log('Done seeding KORNET accounting database!');
