import { PrismaClient } from '@prisma/client';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';

const KORNET = 'KORNET';
const prisma = new PrismaClient();

const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-');

const kornetDbPath = path.resolve('prisma/data/kornet.db');
const accountingDbPath = path.resolve('prisma/data/accounting.db');
const backupDir = path.resolve('prisma/data/backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

console.log('====================================================');
console.log('FACTORY RESET: Kornet Logistics & Accounting System');
console.log('====================================================');

// 1. BACKUPS
if (fs.existsSync(kornetDbPath)) {
  const kornetBackup = path.join(backupDir, `kornet.db.backup-${timestamp}`);
  fs.copyFileSync(kornetDbPath, kornetBackup);
  console.log('✓ Backed up kornet.db to:', kornetBackup);
}

if (fs.existsSync(accountingDbPath)) {
  const accountingBackup = path.join(backupDir, `accounting.db.backup-${timestamp}`);
  fs.copyFileSync(accountingDbPath, accountingBackup);
  console.log('✓ Backed up accounting.db to:', accountingBackup);
}

async function resetLogistics() {
  console.log('\n--- Resetting Logistics Database (kornet.db) ---');

  // Delete all operational transactions
  await prisma.receiptApplication.deleteMany({});
  await prisma.receipt.deleteMany({});
  await prisma.invoiceLine.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.apBillLine.deleteMany({});
  await prisma.apBill.deleteMany({});
  await prisma.checkDirectExpense.deleteMany({});
  await prisma.checkApplication.deleteMany({});
  await prisma.checkDisbursement.deleteMany({});
  await prisma.charge.deleteMany({});
  await prisma.cargoLine.deleteMany({});
  await prisma.container.deleteMany({});
  await prisma.transportDoc.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.quote.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.pdOrder.deleteMany({});
  await prisma.dispatchRoute.deleteMany({});
  await prisma.driver.deleteMany({});
  await prisma.fleetVehicle.deleteMany({});
  await prisma.tariff.deleteMany({});
  await prisma.supportTicket.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.party.deleteMany({});
  await prisma.sequence.deleteMany({});

  console.log('✓ Cleared all operational transactions, shipments, quotes, billing, fleet, and parties.');

  // Ensure default Admin user
  const passwordHash = await bcrypt.hash('kornet2000', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      fullName: 'System Administrator',
      role: 'superadmin',
      active: true,
      canAccessFs: true,
      companies: JSON.stringify([KORNET]),
    },
    create: {
      username: 'admin',
      passwordHash,
      fullName: 'System Administrator',
      role: 'superadmin',
      active: true,
      canAccessFs: true,
      companies: JSON.stringify([KORNET]),
    },
  });
  console.log('✓ Ensured Superadmin account (admin / kornet2000).');

  // Ensure single company
  await prisma.company.upsert({
    where: { code: KORNET },
    update: {
      name: 'Kornet Express Inc.',
      legalName: 'Kornet Express, Inc.',
      address: 'Unit 801, Ermita, Manila, Philippines',
      active: true,
    },
    create: {
      code: KORNET,
      name: 'Kornet Express Inc.',
      legalName: 'Kornet Express, Inc.',
      address: 'Unit 801, Ermita, Manila, Philippines',
      active: true,
    },
  });
  console.log('✓ Ensured company profile for KORNET.');
}

function resetAccounting() {
  console.log('\n--- Resetting Accounting Database (accounting.db) ---');

  if (!fs.existsSync(accountingDbPath)) {
    console.log('accounting.db does not exist, skipping.');
    return;
  }

  const db = new DatabaseSync(accountingDbPath);
  db.exec('PRAGMA foreign_keys = OFF;');

  const tablesToWipe = [
    'fs_accounts',
    'fs_adjstmnt',
    'fs_audit_log',
    'fs_banks',
    'fs_cashrcpt',
    'fs_checkmas',
    'fs_checkvou',
    'fs_effects',
    'fs_journals',
    'fs_post_log',
    'fs_pournals',
    'fs_purcbook',
    'fs_salebook',
    'fs_schedule',
    'fs_signatories',
    'fs_supplier',
  ];

  for (const t of tablesToWipe) {
    try {
      const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(t);
      if (exists) {
        db.exec(`DELETE FROM ${t};`);
        console.log(`✓ Cleared ${t}`);
      }
    } catch (err) {
      console.warn(`Could not clear ${t}:`, err.message);
    }
  }

  // Ensure fresh fiscal period record for KORNET
  try {
    db.exec(`DELETE FROM fs_sys_id WHERE company_code = '${KORNET}';`);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const begDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01 00:00:00`;
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')} 00:00:00`;

    db.prepare(`
      INSERT INTO fs_sys_id (company_code, pres_mo, pres_yr, beg_date, end_date, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(KORNET, currentMonth, currentYear, begDate, endDate);
    console.log(`✓ Initialized fresh fiscal period: ${currentYear}-${String(currentMonth).padStart(2, '0')} for KORNET.`);
  } catch (err) {
    console.warn('Could not reset fs_sys_id:', err.message);
  }

  console.log('Vacuuming accounting.db...');
  db.exec('VACUUM;');
  db.close();
  console.log('✓ accounting.db successfully reset and vacuumed.');
}

async function main() {
  await resetLogistics();
  resetAccounting();
  console.log('\n====================================================');
  console.log('FACTORY RESET COMPLETE');
  console.log('The system is now in a pristine, blank state.');
  console.log('All operational shipments, invoices, vouchers, and accounts are cleared.');
  console.log('Login credentials: admin / kornet2000');
  console.log('====================================================\n');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('Factory reset failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
