import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const dbPath = path.resolve('prisma/data/accounting.db');
const backupPath = path.resolve('prisma/data/accounting.db.bak_before_clean');

// 1. Create a backup just in case
if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(dbPath, backupPath);
  console.log('Created backup at:', backupPath);
}

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = OFF;');

console.log('Starting cleanup of accounting.db for KORNET-only...');

// 2. Drop unrelated tables from the external project
const tablesToDrop = [
  'pay_dept',
  'pay_master',
  'pay_prempaid',
  'pay_sys_id',
  'pay_taxtab',
  'pay_tmcard',
  'app_support_tickets',
  'app_announcements',
  'app_announcement_reactions',
  'app_refresh_tokens',
  'app_audit_logs'
];

for (const t of tablesToDrop) {
  try {
    db.exec(`DROP TABLE IF EXISTS ${t}`);
    console.log(`Dropped legacy table: ${t}`);
  } catch (err) {
    console.warn(`Could not drop ${t}:`, err.message);
  }
}

// 3. Clean company_code in all fs_* tables
const fsTables = [
  'fs_accounts',
  'fs_adjstmnt',
  'fs_banks',
  'fs_cashrcpt',
  'fs_checkmas',
  'fs_checkvou',
  'fs_effects',
  'fs_journals',
  'fs_pournals',
  'fs_purcbook',
  'fs_salebook',
  'fs_schedule',
  'fs_signatories',
  'fs_supplier',
  'fs_sys_id',
  'fs_post_log',
  'fs_audit_log'
];

for (const t of fsTables) {
  try {
    const tableExists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t);
    if (!tableExists) continue;

    const cols = db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name);
    if (cols.includes('company_code')) {
      const res = db.prepare(`DELETE FROM ${t} WHERE company_code != 'KORNET'`).run();
      console.log(`Purged non-KORNET from ${t}: ${res.changes} rows deleted`);
    }
  } catch (err) {
    console.warn(`Error cleaning ${t}:`, err.message);
  }
}

// 4. Update app_companies to only have KORNET
try {
  const tableExists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='app_companies'").get();
  if (tableExists) {
    db.exec("DELETE FROM app_companies WHERE code != 'KORNET'");
    const kornetExists = db.prepare("SELECT 1 FROM app_companies WHERE code = 'KORNET'").get();
    if (!kornetExists) {
      db.prepare("INSERT INTO app_companies (code, name, is_active, created_at) VALUES ('KORNET', 'KORNET EXPRESS, INC.', 1, datetime('now'))").run();
      console.log('Inserted KORNET into app_companies');
    }
  }
} catch (err) {
  console.warn('Error in app_companies:', err.message);
}

// 5. Clean app_users to only keep admin if table exists
try {
  const tableExists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='app_users'").get();
  if (tableExists) {
    db.exec("DELETE FROM app_users WHERE username != 'admin'");
    console.log('Purged non-admin users from app_users');
  }
} catch (err) {
  console.warn('Error in app_users:', err.message);
}

// 6. Vacuum database
console.log('Vacuuming database...');
db.exec('VACUUM;');
db.close();

console.log('Cleanup completed successfully!');
