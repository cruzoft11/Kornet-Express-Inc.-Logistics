import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { env } from '../env.js';

export interface LedgerLine { acctCode: string; dc: 'D' | 'C'; amount: number; memo?: string }
export interface LedgerEntry {
  companyCode: string;
  journal: 'SALEBOOK' | 'PURCBOOK' | 'CRB' | 'CDB' | 'JV';
  refNo: string;
  date: string;
  payee?: string;
  description?: string;
  bankNo?: number;
  supNo?: number;
  checkNo?: string;
  lines: LedgerLine[];
  userId?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const JOURNAL_TABLE: Record<LedgerEntry['journal'], string> = {
  SALEBOOK: 'fs_salebook',
  PURCBOOK: 'fs_purcbook',
  CRB: 'fs_cashrcpt',
  CDB: 'fs_checkvou',
  JV: 'fs_journals',
};

const JOURNAL_PREFIX: Record<LedgerEntry['journal'], string> = {
  SALEBOOK: 'SB',
  PURCBOOK: 'PB',
  CRB: 'CR',
  CDB: 'CDV',
  JV: 'JV',
};

type SqliteRow = Record<string, unknown>;
let sharedDb: DatabaseSync | null = null;

function candidateDbPaths(): string[] {
  return [
    env.accountingDbPath,
    path.resolve(__dirname, '../../prisma/data/accounting.db'),
    path.resolve(__dirname, '../../../prisma/data/accounting.db'),
    path.resolve(process.cwd(), 'server/prisma/data/accounting.db'),
    path.resolve(process.cwd(), 'prisma/data/accounting.db'),
  ];
}

export function accountingDbPath(): string {
  const found = candidateDbPaths().find((p) => p && fs.existsSync(p));
  return found || env.accountingDbPath || candidateDbPaths()[1];
}

export function getLedgerDb(): DatabaseSync {
  if (!sharedDb) {
    sharedDb = new DatabaseSync(accountingDbPath());
    sharedDb.exec('PRAGMA foreign_keys = ON');
    ensureLedgerTables(sharedDb);
  }
  return sharedDb;
}

export function closeLedgerDb(): void {
  sharedDb?.close();
  sharedDb = null;
}

function ensureLedgerTables(db = getLedgerDb()): void {
  db.exec(`CREATE TABLE IF NOT EXISTS fs_post_log (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_no TEXT NOT NULL,
    company_code TEXT NOT NULL,
    journal TEXT NOT NULL,
    jv_no TEXT NOT NULL,
    posted_at TEXT NOT NULL,
    posted_by TEXT,
    UNIQUE(company_code, ref_no)
  )`);
  db.exec(`CREATE TABLE IF NOT EXISTS fs_audit_log (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    company_code TEXT NOT NULL,
    ref_no TEXT,
    detail TEXT,
    created_at TEXT NOT NULL,
    created_by_user_id TEXT
  )`);
}

const money = (n: unknown): number => Math.round((Number(n) || 0) * 100) / 100;
const compactDate = (d: string): string => String(d || '').slice(0, 10);
const isDc = (dc: unknown): dc is 'D' | 'C' => dc === 'D' || dc === 'C';

function validateDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(compactDate(date));
}

export function getPeriod(companyCode: string) {
  const db = getLedgerDb();
  const row = db.prepare('SELECT * FROM fs_sys_id WHERE company_code = ? ORDER BY Id DESC LIMIT 1').get(companyCode) as SqliteRow | undefined;
  return row
    ? {
        id: row.Id,
        currentMonth: Number(row.pres_mo),
        currentYear: Number(row.pres_yr),
        begDate: String(row.beg_date ?? '').slice(0, 10),
        endDate: String(row.end_date ?? '').slice(0, 10),
        companyCode: row.company_code,
      }
    : null;
}

export function getAccounts(companyCode: string) {
  const db = getLedgerDb();
  return db
    .prepare(`SELECT * FROM fs_accounts WHERE company_code = ? AND (is_active IS NULL OR is_active = 1) ORDER BY acct_code`)
    .all(companyCode) as SqliteRow[];
}

export function listBanks(companyCode: string) {
  return getLedgerDb().prepare('SELECT * FROM fs_banks WHERE company_code = ? ORDER BY bank_no').all(companyCode) as SqliteRow[];
}

export function listSuppliers(companyCode: string) {
  return getLedgerDb().prepare('SELECT * FROM fs_supplier WHERE company_code = ? ORDER BY sup_no').all(companyCode) as SqliteRow[];
}

function existingPost(entry: LedgerEntry): string | null {
  const row = getLedgerDb()
    .prepare('SELECT jv_no FROM fs_post_log WHERE company_code = ? AND ref_no = ?')
    .get(entry.companyCode, entry.refNo) as { jv_no?: string } | undefined;
  return row?.jv_no ?? null;
}

export function trialPost(entry: LedgerEntry): { ok: boolean; errors: string[]; totalDebit: number; totalCredit: number } {
  ensureLedgerTables();
  const errors: string[] = [];
  const companyCode = String(entry.companyCode || '').trim().toUpperCase();
  const refNo = String(entry.refNo || '').trim();
  const date = compactDate(entry.date);

  if (!companyCode) errors.push('companyCode is required');
  if (!refNo) errors.push('refNo is required');
  if (!validateDate(date)) errors.push('date must be YYYY-MM-DD');
  if (!entry.lines || entry.lines.length < 2) errors.push('at least two ledger lines are required');
  if (!['SALEBOOK', 'PURCBOOK', 'CRB', 'CDB', 'JV'].includes(entry.journal)) errors.push('invalid journal');

  const totalDebit = money((entry.lines || []).filter((l) => l.dc === 'D').reduce((s, l) => s + money(l.amount), 0));
  const totalCredit = money((entry.lines || []).filter((l) => l.dc === 'C').reduce((s, l) => s + money(l.amount), 0));
  if (Math.abs(totalDebit - totalCredit) > 0.005) errors.push(`debits ${totalDebit.toFixed(2)} must equal credits ${totalCredit.toFixed(2)}`);
  if (totalDebit <= 0) errors.push('entry total must be greater than zero');

  const db = getLedgerDb();
  if (companyCode && refNo && existingPost({ ...entry, companyCode, refNo })) errors.push(`refNo ${refNo} is already posted for ${companyCode}`);

  const period = companyCode ? getPeriod(companyCode) : null;
  if (!period) errors.push(`open fiscal period not found for ${companyCode}`);
  else if (date < period.begDate || date > period.endDate) errors.push(`date ${date} is outside open period ${period.begDate}..${period.endDate}`);

  const seen = new Map<string, SqliteRow | undefined>();
  for (const [idx, line] of (entry.lines || []).entries()) {
    const acctCode = String(line.acctCode || '').trim().toUpperCase();
    const amount = money(line.amount);
    if (!acctCode) { errors.push(`line ${idx + 1}: acctCode is required`); continue; }
    if (!isDc(line.dc)) errors.push(`line ${idx + 1}: dc must be D or C`);
    if (amount <= 0) errors.push(`line ${idx + 1}: amount must be greater than zero`);
    let account = seen.get(acctCode);
    if (!seen.has(acctCode)) {
      account = db.prepare('SELECT * FROM fs_accounts WHERE company_code = ? AND acct_code = ?').get(companyCode, acctCode) as SqliteRow | undefined;
      seen.set(acctCode, account);
    }
    if (!account) errors.push(`line ${idx + 1}: account ${acctCode} does not exist for ${companyCode}`);
    else if (!(account.is_active === 1 || account.is_active === true || account.is_active == null)) errors.push(`line ${idx + 1}: account ${acctCode} is inactive`);
    else if (!['DC', 'CD'].includes(String(account.formula || '').toUpperCase())) errors.push(`line ${idx + 1}: account ${acctCode} is not postable`);
  }

  return { ok: errors.length === 0, errors, totalDebit, totalCredit };
}

function nextJvNo(db: DatabaseSync, entry: LedgerEntry): string {
  const prefix = JOURNAL_PREFIX[entry.journal];
  const yyyymm = compactDate(entry.date).slice(0, 7).replace('-', '');
  const like = `${prefix}-${yyyymm}-%`;
  const sql = `SELECT jv_no v FROM fs_post_log WHERE company_code = ? AND journal = ? AND jv_no LIKE ?
    UNION ALL SELECT j_jv_no v FROM ${entry.journal === 'CDB' ? 'fs_checkmas' : JOURNAL_TABLE[entry.journal]} WHERE company_code = ? AND j_jv_no LIKE ?`;
  const rows = db.prepare(sql).all(entry.companyCode, entry.journal, like, entry.companyCode, like) as { v?: string }[];
  const max = rows.reduce((m, r) => {
    const n = Number(String(r.v || '').match(/(\d+)$/)?.[1] || 0);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `${prefix}-${yyyymm}-${String(max + 1).padStart(4, '0')}`;
}

function updateAccountBalance(db: DatabaseSync, companyCode: string, acctCode: string): void {
  const sums = db
    .prepare(`SELECT
      COALESCE(SUM(CASE WHEN j_d_or_c = 'D' THEN ROUND(j_ck_amt, 2) ELSE 0 END), 0) debit,
      COALESCE(SUM(CASE WHEN j_d_or_c = 'C' THEN ROUND(j_ck_amt, 2) ELSE 0 END), 0) credit
      FROM fs_pournals WHERE company_code = ? AND acct_code = ?`)
    .get(companyCode, acctCode) as { debit: number; credit: number };
  const acct = db.prepare('SELECT open_bal, formula FROM fs_accounts WHERE company_code = ? AND acct_code = ?').get(companyCode, acctCode) as { open_bal?: number; formula?: string };
  const openBal = money(acct?.open_bal || 0);
  const debit = money(sums.debit);
  const credit = money(sums.credit);
  const formula = String(acct?.formula || 'DC').toUpperCase();
  const endBal = money(formula === 'CD' ? openBal + credit - debit : openBal + debit - credit);
  db.prepare('UPDATE fs_accounts SET cur_debit = ?, cur_credit = ?, end_bal = ?, updated_at = datetime(\'now\') WHERE company_code = ? AND acct_code = ?')
    .run(debit, credit, endBal, companyCode, acctCode);
}

function insertJournalLine(db: DatabaseSync, table: string, jvNo: string, date: string, line: LedgerLine, companyCode: string, userId?: string): void {
  db.prepare(`INSERT INTO ${table} (j_jv_no, j_date, acct_code, j_ck_amt, j_d_or_c, company_code, is_deleted, created_at, updated_at, created_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'), ?)`)
    .run(jvNo, date, line.acctCode.trim().toUpperCase(), money(line.amount), line.dc, companyCode, userId ?? null);
}

export function finalPost(entry: LedgerEntry): { jvNo: string } {
  ensureLedgerTables();
  const normalized: LedgerEntry = {
    ...entry,
    companyCode: String(entry.companyCode || '').trim().toUpperCase(),
    refNo: String(entry.refNo || '').trim(),
    date: compactDate(entry.date),
    lines: (entry.lines || []).map((l) => ({ ...l, acctCode: String(l.acctCode || '').trim().toUpperCase(), amount: money(l.amount) })),
  };
  const already = existingPost(normalized);
  if (already) return { jvNo: already };
  const trial = trialPost(normalized);
  if (!trial.ok) throw new Error(`Ledger validation failed: ${trial.errors.join('; ')}`);

  const db = getLedgerDb();
  let jvNo = '';
  db.exec('BEGIN IMMEDIATE');
  try {
    const again = db.prepare('SELECT jv_no FROM fs_post_log WHERE company_code = ? AND ref_no = ?').get(normalized.companyCode, normalized.refNo) as { jv_no?: string } | undefined;
    if (again?.jv_no) {
      db.exec('COMMIT');
      return { jvNo: again.jv_no };
    }
    jvNo = nextJvNo(db, normalized);
    const date = compactDate(normalized.date);
    if (normalized.journal === 'CDB') {
      const checkNo = normalized.checkNo || normalized.refNo;
      db.prepare(`INSERT INTO fs_checkmas (j_jv_no, j_ck_no, j_date, j_pay_to, j_ck_amt, j_desc, bank_no, sup_no, company_code, is_deleted, created_at, updated_at, created_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'), ?)`).run(
        jvNo, checkNo, date, normalized.payee || '', trial.totalDebit, normalized.description || '', normalized.bankNo ?? 0, normalized.supNo ?? 0, normalized.companyCode, normalized.userId ?? null,
      );
      for (const line of normalized.lines) {
        db.prepare(`INSERT INTO fs_checkvou (j_ck_no, acct_code, j_ck_amt, j_d_or_c, company_code, is_deleted, created_at, updated_at, created_by_user_id)
          VALUES (?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'), ?)`).run(checkNo, line.acctCode, line.amount, line.dc, normalized.companyCode, normalized.userId ?? null);
      }
    } else {
      const table = JOURNAL_TABLE[normalized.journal];
      for (const line of normalized.lines) insertJournalLine(db, table, jvNo, date, line, normalized.companyCode, normalized.userId);
    }

    for (const line of normalized.lines) {
      db.prepare(`INSERT INTO fs_pournals (j_jv_no, j_date, acct_code, j_ck_amt, j_d_or_c, company_code, created_at, created_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`).run(jvNo, date, line.acctCode, line.amount, line.dc, normalized.companyCode, normalized.userId ?? null);
    }
    for (const acctCode of [...new Set(normalized.lines.map((l) => l.acctCode))]) updateAccountBalance(db, normalized.companyCode, acctCode);
    db.prepare('INSERT INTO fs_post_log (ref_no, company_code, journal, jv_no, posted_at, posted_by) VALUES (?, ?, ?, ?, datetime(\'now\'), ?)')
      .run(normalized.refNo, normalized.companyCode, normalized.journal, jvNo, normalized.userId ?? null);
    db.prepare('INSERT INTO fs_audit_log (action, company_code, ref_no, detail, created_at, created_by_user_id) VALUES (?, ?, ?, ?, datetime(\'now\'), ?)')
      .run('FINAL_POST', normalized.companyCode, normalized.refNo, JSON.stringify({ journal: normalized.journal, jvNo }), normalized.userId ?? null);
    db.exec('COMMIT');
    return { jvNo };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function reverse(refNo: string, companyCode: string, date: string, userId?: string): { jvNo: string } {
  const db = getLedgerDb();
  const posted = db.prepare('SELECT * FROM fs_post_log WHERE company_code = ? AND ref_no = ?').get(companyCode, refNo) as { jv_no?: string; journal?: LedgerEntry['journal'] } | undefined;
  if (!posted?.jv_no) throw new Error(`Posted reference ${refNo} was not found`);
  const reverseRef = `REV-${refNo}`;
  const existing = db.prepare('SELECT jv_no FROM fs_post_log WHERE company_code = ? AND ref_no = ?').get(companyCode, reverseRef) as { jv_no?: string } | undefined;
  if (existing?.jv_no) return { jvNo: existing.jv_no };
  const rows = db.prepare('SELECT acct_code, j_ck_amt, j_d_or_c FROM fs_pournals WHERE company_code = ? AND j_jv_no = ? ORDER BY Id').all(companyCode, posted.jv_no) as SqliteRow[];
  if (rows.length === 0) throw new Error(`Posted journal ${posted.jv_no} has no lines`);
  return finalPost({
    companyCode,
    journal: 'JV',
    refNo: reverseRef,
    date: compactDate(date),
    description: `Reversal of ${refNo}`,
    userId,
    lines: rows.map((r) => ({ acctCode: String(r.acct_code), amount: money(r.j_ck_amt), dc: r.j_d_or_c === 'D' ? 'C' : 'D' })),
  });
}

export function recomputeCompanyBalances(companyCode: string): void {
  const db = getLedgerDb();
  const accts = db.prepare('SELECT acct_code FROM fs_accounts WHERE company_code = ?').all(companyCode) as { acct_code: string }[];
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const acct of accts) updateAccountBalance(db, companyCode, acct.acct_code);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
