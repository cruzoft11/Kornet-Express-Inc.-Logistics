import { Router, type Request, type Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Open connection to self-contained accounting SQLite DB
const candidatePaths = [
  path.resolve(__dirname, '../../prisma/data/accounting.db'),
  path.resolve(__dirname, '../../../prisma/data/accounting.db'),
  path.resolve(process.cwd(), 'server/prisma/data/accounting.db'),
  path.resolve(process.cwd(), 'prisma/data/accounting.db'),
  path.resolve(process.cwd(), 'data/accounting.db'),
];
const dbPath = candidatePaths.find((p) => fs.existsSync(p)) || candidatePaths[0];
const db = new DatabaseSync(dbPath);

const router = Router();

function getCompany(req: Request): string {
  const code = (req.headers['x-company-code'] as string | undefined)?.trim();
  if (code && code !== 'undefined' && code !== 'null') return code;
  return req.companyCode || 'KORNET';
}

function mapMaster(r: any) {
  if (!r) return null;
  return {
    id: r.Id ?? r.id ?? 0,
    jJvNo: r.j_jv_no ?? r.jJvNo ?? '',
    jCkNo: r.j_ck_no ?? r.jCkNo ?? '',
    jDate: r.j_date ?? r.jDate ?? '',
    jPayTo: r.j_pay_to ?? r.jPayTo ?? '',
    jCkAmt: parseFloat(r.j_ck_amt ?? r.jCkAmt ?? 0),
    jDesc: r.j_desc ?? r.jDesc ?? '',
    bankNo: r.bank_no ?? r.bankNo ?? 0,
    supNo: r.sup_no ?? r.supNo ?? 0,
  };
}

function mapLine(r: any) {
  if (!r) return null;
  return {
    id: r.Id ?? r.id ?? 0,
    jCkNo: r.j_ck_no ?? r.jCkNo ?? '',
    acctCode: r.acct_code ?? r.acctCode ?? '',
    jCkAmt: parseFloat(r.j_ck_amt ?? r.jCkAmt ?? 0),
    jDOrC: (r.j_d_or_c ?? r.jDOrC ?? 'D') as 'D' | 'C',
  };
}

function mapAccount(r: any) {
  if (!r) return null;
  return {
    id: r.Id ?? r.id ?? 0,
    acctCode: r.acct_code ?? r.acctCode ?? '',
    acctDesc: r.acct_desc ?? r.acctDesc ?? '',
    acctType: r.acct_type ?? r.acctType ?? '',
    groupCode: r.group_code ?? r.groupCode ?? '',
    subGroup: r.sub_group ?? r.subGroup ?? '',
    formula: r.formula ?? '',
    openBal: parseFloat(r.open_bal ?? r.openBal ?? 0),
    curDebit: parseFloat(r.cur_debit ?? r.curDebit ?? 0),
    curCredit: parseFloat(r.cur_credit ?? r.curCredit ?? 0),
    endBal: parseFloat(r.end_bal ?? r.endBal ?? 0),
    glReport: r.gl_report ?? r.glReport ?? '',
    glEffect: r.gl_effect ?? r.glEffect ?? '',
    schedule: r.schedule ?? '',
    initialize: r.initialize ?? '',
    isActive: r.is_active === 1 || r.is_active === true,
  };
}

function mapBank(r: any) {
  if (!r) return null;
  return {
    id: r.Id ?? r.id ?? 0,
    bankNo: r.bank_no ?? r.bankNo ?? 0,
    bankName: r.bank_name ?? r.bankName ?? '',
    bankAddr: r.bank_addr ?? r.bankAddr ?? '',
    bankAcct: r.bank_acct ?? r.bankAcct ?? '',
  };
}

function mapSupplier(r: any) {
  if (!r) return null;
  return {
    id: r.Id ?? r.id ?? 0,
    supNo: r.sup_no ?? r.supNo ?? 0,
    supName: r.sup_name ?? r.supName ?? '',
    supAddr: r.sup_addr ?? r.supAddr ?? '',
    supPhone: r.sup_phone ?? r.supPhone ?? '',
    supFax: r.sup_fax ?? r.supFax ?? '',
    supContak: r.sup_contak ?? r.supContak ?? '',
  };
}

// ───────────────────────────────────────────────
// SYSTEM INFO / ACTIVE FISCAL PERIOD
// ───────────────────────────────────────────────
router.get(
  '/system-info',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    let sys: any = db.prepare('SELECT * FROM fs_sys_id WHERE company_code = ?').get(comp);
    if (!sys) {
      sys = db.prepare('SELECT * FROM fs_sys_id ORDER BY Id DESC LIMIT 1').get();
    }

    const currentMonth = sys?.pres_mo ?? 9;
    const currentYear = sys?.pres_yr ?? 2026;
    const begDate = sys?.beg_date ?? '2026-09-01 00:00:00';
    const endDate = sys?.end_date ?? '2026-09-30 00:00:00';

    const getCount = (tbl: string) => {
      try {
        const row: any = db
          .prepare(`SELECT COUNT(*) as c FROM ${tbl} WHERE (company_code = ? OR company_code IS NULL) AND (is_deleted IS NULL OR is_deleted = 0)`)
          .get(comp);
        return row?.c ?? 0;
      } catch {
        return 0;
      }
    };

    const unpostedChecks = getCount('fs_checkmas');
    const unpostedCashReceipts = getCount('fs_cashrcpt');
    const unpostedSalesBook = getCount('fs_salebook');
    const unpostedJournals = getCount('fs_journals');
    const unpostedPurchaseBook = getCount('fs_purcbook');
    const unpostedAdjustments = getCount('fs_adjstmnt');
    const totalUnposted =
      unpostedChecks +
      unpostedCashReceipts +
      unpostedSalesBook +
      unpostedJournals +
      unpostedPurchaseBook +
      unpostedAdjustments;

    const payload = {
      currentMonth,
      currentYear,
      begDate,
      endDate,
      unpostedChecks,
      unpostedCashReceipts,
      unpostedSalesBook,
      unpostedJournals,
      unpostedPurchaseBook,
      unpostedAdjustments,
      totalUnposted,
      companyCode: comp,
    };

    res.json(payload);
  }),
);

// ───────────────────────────────────────────────
// CHECK VOUCHERS (CDV & ADVANCE)
// ───────────────────────────────────────────────
router.get(
  '/vouchers/masters',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    const type = ((req.query.type as string) || 'all').toLowerCase();

    let sys: any = db.prepare('SELECT * FROM fs_sys_id WHERE company_code = ?').get(comp);
    if (!sys) sys = db.prepare('SELECT * FROM fs_sys_id ORDER BY Id DESC LIMIT 1').get();
    const endDate = (sys?.end_date || '2026-09-30').slice(0, 10);

    let rows: any[] = [];
    if (type === 'current') {
      rows = db
        .prepare(
          `SELECT * FROM fs_checkmas 
           WHERE (company_code = ? OR company_code = 'KORNET') 
             AND (is_deleted IS NULL OR is_deleted = 0) 
             AND j_ck_no NOT LIKE 'ADV%' 
             AND (j_date IS NULL OR j_date <= ?)
           ORDER BY j_date DESC, Id DESC`,
        )
        .all(comp, endDate) as any[];
    } else if (type === 'advance') {
      rows = db
        .prepare(
          `SELECT * FROM fs_checkmas 
           WHERE (company_code = ? OR company_code = 'KORNET') 
             AND (is_deleted IS NULL OR is_deleted = 0) 
             AND (j_ck_no LIKE 'ADV%' OR j_date > ?)
           ORDER BY j_date DESC, Id DESC`,
        )
        .all(comp, endDate) as any[];
    } else {
      rows = db
        .prepare(
          `SELECT * FROM fs_checkmas 
           WHERE (company_code = ? OR company_code = 'KORNET') 
             AND (is_deleted IS NULL OR is_deleted = 0) 
           ORDER BY j_date DESC, Id DESC`,
        )
        .all(comp) as any[];
    }

    res.json({ data: rows.map(mapMaster), count: rows.length });
  }),
);

router.get(
  '/vouchers/masters/:checkNo',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    const checkNo = req.params.checkNo;
    const row = db
      .prepare(
        `SELECT * FROM fs_checkmas 
         WHERE (company_code = ? OR company_code = 'KORNET') 
           AND (j_ck_no = ? OR j_jv_no = ?)
           AND (is_deleted IS NULL OR is_deleted = 0) 
         LIMIT 1`,
      )
      .get(comp, checkNo, checkNo);

    if (!row) {
      res.status(404).json({ message: `Check ${checkNo} not found` });
      return;
    }
    res.json({ data: mapMaster(row) });
  }),
);

router.get(
  '/vouchers/checkmaster/jv/:jvNo',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    const jvNo = req.params.jvNo;
    const row = db
      .prepare(
        `SELECT * FROM fs_checkmas 
         WHERE (company_code = ? OR company_code = 'KORNET') 
           AND j_jv_no = ? 
           AND (is_deleted IS NULL OR is_deleted = 0) 
         LIMIT 1`,
      )
      .get(comp, jvNo);

    if (!row) {
      res.status(404).json({ message: `CDV ${jvNo} not found` });
      return;
    }
    res.json({ data: mapMaster(row) });
  }),
);

router.get(
  '/vouchers/checkmaster/no/:checkNo',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    const checkNo = req.params.checkNo;
    const row = db
      .prepare(
        `SELECT * FROM fs_checkmas 
         WHERE (company_code = ? OR company_code = 'KORNET') 
           AND j_ck_no = ? 
           AND (is_deleted IS NULL OR is_deleted = 0) 
         LIMIT 1`,
      )
      .get(comp, checkNo);

    if (!row) {
      res.status(404).json({ message: `Check ${checkNo} not found` });
      return;
    }
    res.json({ data: mapMaster(row) });
  }),
);

router.get(
  '/vouchers/lines',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    const rows = db
      .prepare(
        `SELECT * FROM fs_checkvou 
         WHERE (company_code = ? OR company_code = 'KORNET') 
           AND (is_deleted IS NULL OR is_deleted = 0) 
         ORDER BY Id ASC`,
      )
      .all(comp) as any[];
    res.json({ data: rows.map(mapLine), count: rows.length });
  }),
);

router.get(
  '/vouchers/lines/:checkNo',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    const checkNo = req.params.checkNo;
    const rows = db
      .prepare(
        `SELECT * FROM fs_checkvou 
         WHERE (company_code = ? OR company_code = 'KORNET') 
           AND j_ck_no = ? 
           AND (is_deleted IS NULL OR is_deleted = 0) 
         ORDER BY Id ASC`,
      )
      .all(comp, checkNo) as any[];
    res.json({ data: rows.map(mapLine), count: rows.length });
  }),
);

router.get(
  '/vouchers/unbalanced',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    const rows = db
      .prepare(
        `SELECT v.j_ck_no as ckNo,
                SUM(CASE WHEN v.j_d_or_c = 'D' THEN v.j_ck_amt ELSE 0 END) as debitTotal,
                SUM(CASE WHEN v.j_d_or_c = 'C' THEN v.j_ck_amt ELSE 0 END) as creditTotal
         FROM fs_checkvou v
         WHERE (v.company_code = ? OR v.company_code = 'KORNET')
           AND (v.is_deleted IS NULL OR v.is_deleted = 0)
         GROUP BY v.j_ck_no
         HAVING ABS(debitTotal - creditTotal) > 0.01`,
      )
      .all(comp) as any[];

    const unbalanced = rows.map((r) => ({
      ckNo: r.ckNo,
      balance: Math.abs(r.debitTotal - r.creditTotal),
    }));

    res.json({ data: unbalanced, count: unbalanced.length });
  }),
);

router.post(
  '/vouchers/masters',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    const { jJvNo, jCkNo, jDate, jPayTo, jDesc, jCkAmt, bankNo, supNo } = req.body;

    db.prepare(
      `INSERT INTO fs_checkmas (j_jv_no, j_ck_no, j_date, j_pay_to, j_ck_amt, j_desc, bank_no, sup_no, company_code, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
    ).run(
      jJvNo || `CDV-${Date.now()}`,
      jCkNo || jJvNo || `CHK-${Date.now()}`,
      jDate ? jDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      jPayTo || 'CASH',
      parseFloat(jCkAmt || 0),
      jDesc || '',
      parseInt(bankNo || 1, 10),
      parseInt(supNo || 0, 10),
      comp,
    );

    const inserted: any = db
      .prepare('SELECT * FROM fs_checkmas WHERE company_code = ? ORDER BY Id DESC LIMIT 1')
      .get(comp);

    res.status(201).json({ data: mapMaster(inserted) });
  }),
);

router.put(
  '/vouchers/masters/:checkNo',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    const checkNo = req.params.checkNo;
    const { jJvNo, jCkNo, jDate, jPayTo, jDesc, jCkAmt, bankNo, supNo } = req.body;

    db.prepare(
      `UPDATE fs_checkmas 
       SET j_jv_no = COALESCE(?, j_jv_no),
           j_ck_no = COALESCE(?, j_ck_no),
           j_date = COALESCE(?, j_date),
           j_pay_to = COALESCE(?, j_pay_to),
           j_desc = COALESCE(?, j_desc),
           j_ck_amt = COALESCE(?, j_ck_amt),
           bank_no = COALESCE(?, bank_no),
           sup_no = COALESCE(?, sup_no),
           updated_at = datetime('now')
       WHERE (company_code = ? OR company_code = 'KORNET') AND j_ck_no = ?`,
    ).run(
      jJvNo,
      jCkNo,
      jDate ? jDate.slice(0, 10) : null,
      jPayTo,
      jDesc,
      jCkAmt !== undefined ? parseFloat(jCkAmt) : null,
      bankNo !== undefined ? parseInt(bankNo, 10) : null,
      supNo !== undefined ? parseInt(supNo, 10) : null,
      comp,
      checkNo,
    );

    const updated: any = db
      .prepare('SELECT * FROM fs_checkmas WHERE (company_code = ? OR company_code = \'KORNET\') AND j_ck_no = ?')
      .get(comp, jCkNo || checkNo);

    res.json({ data: mapMaster(updated) });
  }),
);

router.delete(
  '/vouchers/masters/:checkNo',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    const checkNo = req.params.checkNo;

    db.prepare(
      `UPDATE fs_checkmas SET is_deleted = 1, deleted_at = datetime('now') WHERE (company_code = ? OR company_code = 'KORNET') AND j_ck_no = ?`,
    ).run(comp, checkNo);

    db.prepare(
      `UPDATE fs_checkvou SET is_deleted = 1, deleted_at = datetime('now') WHERE (company_code = ? OR company_code = 'KORNET') AND j_ck_no = ?`,
    ).run(comp, checkNo);

    res.json({ success: true, message: `Check ${checkNo} deleted` });
  }),
);

router.post(
  '/vouchers/lines',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    const { jCkNo, acctCode, jCkAmt, jDOrC } = req.body;

    const amt = parseFloat(jCkAmt || 0);
    const dOrC = (jDOrC || 'D').toUpperCase();

    db.prepare(
      `INSERT INTO fs_checkvou (j_ck_no, acct_code, j_ck_amt, j_d_or_c, company_code, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
    ).run(jCkNo, (acctCode || '').trim().toUpperCase(), amt, dOrC, comp);

    // Sync master amount (total debits)
    const sumRow: any = db
      .prepare(
        `SELECT SUM(j_ck_amt) as total FROM fs_checkvou 
         WHERE (company_code = ? OR company_code = 'KORNET') AND j_ck_no = ? AND j_d_or_c = 'D' AND (is_deleted IS NULL OR is_deleted = 0)`,
      )
      .get(comp, jCkNo);

    if (sumRow?.total) {
      db.prepare(`UPDATE fs_checkmas SET j_ck_amt = ? WHERE (company_code = ? OR company_code = 'KORNET') AND j_ck_no = ?`).run(
        sumRow.total,
        comp,
        jCkNo,
      );
    }

    const inserted: any = db
      .prepare('SELECT * FROM fs_checkvou WHERE company_code = ? ORDER BY Id DESC LIMIT 1')
      .get(comp);

    res.status(201).json({ data: mapLine(inserted) });
  }),
);

router.put(
  '/vouchers/lines/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    const lineId = parseInt(req.params.id, 10);
    const { acctCode, jCkAmt, jDOrC } = req.body;

    const amt = parseFloat(jCkAmt || 0);
    const dOrC = (jDOrC || 'D').toUpperCase();

    db.prepare(
      `UPDATE fs_checkvou 
       SET acct_code = COALESCE(?, acct_code),
           j_ck_amt = COALESCE(?, j_ck_amt),
           j_d_or_c = COALESCE(?, j_d_or_c),
           updated_at = datetime('now')
       WHERE Id = ?`,
    ).run(acctCode ? acctCode.trim().toUpperCase() : null, amt, dOrC, lineId);

    const updated: any = db.prepare('SELECT * FROM fs_checkvou WHERE Id = ?').get(lineId);

    if (updated?.j_ck_no) {
      const sumRow: any = db
        .prepare(
          `SELECT SUM(j_ck_amt) as total FROM fs_checkvou 
           WHERE (company_code = ? OR company_code = 'KORNET') AND j_ck_no = ? AND j_d_or_c = 'D' AND (is_deleted IS NULL OR is_deleted = 0)`,
        )
        .get(comp, updated.j_ck_no);
      if (sumRow?.total !== undefined) {
        db.prepare(`UPDATE fs_checkmas SET j_ck_amt = ? WHERE (company_code = ? OR company_code = 'KORNET') AND j_ck_no = ?`).run(
          sumRow.total,
          comp,
          updated.j_ck_no,
        );
      }
    }

    res.json({ data: mapLine(updated) });
  }),
);

router.delete(
  '/vouchers/lines/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    const lineId = parseInt(req.params.id, 10);
    const line: any = db.prepare('SELECT * FROM fs_checkvou WHERE Id = ?').get(lineId);

    db.prepare('DELETE FROM fs_checkvou WHERE Id = ?').run(lineId);

    if (line?.j_ck_no) {
      const sumRow: any = db
        .prepare(
          `SELECT SUM(j_ck_amt) as total FROM fs_checkvou 
           WHERE (company_code = ? OR company_code = 'KORNET') AND j_ck_no = ? AND j_d_or_c = 'D' AND (is_deleted IS NULL OR is_deleted = 0)`,
        )
        .get(comp, line.j_ck_no);
      db.prepare(`UPDATE fs_checkmas SET j_ck_amt = ? WHERE (company_code = ? OR company_code = 'KORNET') AND j_ck_no = ?`).run(
        sumRow?.total ?? 0,
        comp,
        line.j_ck_no,
      );
    }

    res.json({ success: true, message: 'Line deleted' });
  }),
);

// ───────────────────────────────────────────────
// CHART OF ACCOUNTS
// ───────────────────────────────────────────────
router.get(
  '/accounts',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    let rows: any[] = db
      .prepare(
        `SELECT * FROM fs_accounts 
         WHERE company_code = ? 
         ORDER BY acct_code ASC`,
      )
      .all(comp) as any[];

    if (rows.length === 0) {
      rows = db.prepare('SELECT * FROM fs_accounts WHERE company_code = \'KORNET\' ORDER BY acct_code ASC').all() as any[];
    }
    if (rows.length === 0) {
      rows = db.prepare('SELECT * FROM fs_accounts LIMIT 120').all() as any[];
    }

    res.json({ data: rows.map(mapAccount), count: rows.length });
  }),
);

// ───────────────────────────────────────────────
// BANKS & SUPPLIERS
// ───────────────────────────────────────────────
router.get(
  '/banks',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    let rows: any[] = db.prepare('SELECT * FROM fs_banks WHERE company_code = ? ORDER BY bank_no ASC').all(comp) as any[];
    if (rows.length === 0) {
      rows = db.prepare('SELECT * FROM fs_banks WHERE company_code = \'KORNET\' ORDER BY bank_no ASC').all() as any[];
    }
    if (rows.length === 0) {
      rows = db.prepare('SELECT * FROM fs_banks ORDER BY bank_no ASC').all() as any[];
    }
    res.json({ data: rows.map(mapBank), count: rows.length });
  }),
);

router.get(
  '/suppliers',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    let rows: any[] = db.prepare('SELECT * FROM fs_supplier WHERE company_code = ? ORDER BY sup_no ASC').all(comp) as any[];
    if (rows.length === 0) {
      rows = db.prepare('SELECT * FROM fs_supplier WHERE company_code = \'KORNET\' ORDER BY sup_no ASC').all() as any[];
    }
    if (rows.length === 0) {
      rows = db.prepare('SELECT * FROM fs_supplier ORDER BY sup_no ASC').all() as any[];
    }
    res.json({ data: rows.map(mapSupplier), count: rows.length });
  }),
);

router.get(
  '/signatories',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      data: [
        { id: 1, name: 'Engr. Roberto M. Kornet', title: 'President & CEO', role: 'Executive Signatory' },
        { id: 2, name: 'Ma. Elena V. Santos, CPA', title: 'Chief Financial Officer', role: 'Comptroller / Finance' },
        { id: 3, name: 'Dennis R. Alcantara', title: 'Operations & Fleet Director', role: 'Operations' },
      ],
    });
  }),
);

// ───────────────────────────────────────────────
// ADVANCE CHECKS & TRANSFER CDB
// ───────────────────────────────────────────────
router.get(
  '/advance-checks',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    let sys: any = db.prepare('SELECT * FROM fs_sys_id WHERE company_code = ?').get(comp);
    if (!sys) sys = db.prepare('SELECT * FROM fs_sys_id ORDER BY Id DESC LIMIT 1').get();
    const endDate = (sys?.end_date || '2026-09-30').slice(0, 10);

    const rows = db
      .prepare(
        `SELECT * FROM fs_checkmas 
         WHERE (company_code = ? OR company_code = 'KORNET') 
           AND (is_deleted IS NULL OR is_deleted = 0) 
           AND (j_ck_no LIKE 'ADV%' OR j_date > ?)
         ORDER BY j_date ASC`,
      )
      .all(comp, endDate) as any[];

    res.json({ data: rows.map(mapMaster), count: rows.length });
  }),
);

router.post(
  '/transfer-advance-cdb',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    const { fromDate, toDate } = req.query;

    let sys: any = db.prepare('SELECT * FROM fs_sys_id WHERE company_code = ?').get(comp);
    if (!sys) sys = db.prepare('SELECT * FROM fs_sys_id ORDER BY Id DESC LIMIT 1').get();
    const targetDate = sys?.beg_date?.slice(0, 10) || new Date().toISOString().slice(0, 10);

    const from = String(fromDate || '2000-01-01');
    const to = String(toDate || '2099-12-31');

    const advanceChecks = db
      .prepare(
        `SELECT * FROM fs_checkmas 
         WHERE (company_code = ? OR company_code = 'KORNET') 
           AND (is_deleted IS NULL OR is_deleted = 0) 
           AND (j_ck_no LIKE 'ADV%' OR (j_date >= ? AND j_date <= ?))`,
      )
      .all(comp, from, to) as any[];

    let transferredCount = 0;
    for (const c of advanceChecks) {
      const newCkNo = c.j_ck_no.startsWith('ADV') ? c.j_ck_no.replace(/^ADV/, 'CDV') : c.j_ck_no;
      db.prepare(
        `UPDATE fs_checkmas SET j_ck_no = ?, j_date = ?, updated_at = datetime('now') WHERE Id = ?`,
      ).run(newCkNo, targetDate, c.Id);

      db.prepare(`UPDATE fs_checkvou SET j_ck_no = ? WHERE j_ck_no = ?`).run(newCkNo, c.j_ck_no);
      transferredCount++;
    }

    res.json({
      success: true,
      transferredCount,
      message: `Successfully transferred ${transferredCount} Advance CDVs to current active period (${targetDate}).`,
    });
  }),
);

// ───────────────────────────────────────────────
// POSTING & MONTH-END
// ───────────────────────────────────────────────
router.post(
  '/post',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);

    // Post all check vouchers into fs_pournals
    const vouchers = db
      .prepare(
        `SELECT m.j_jv_no, m.j_date, v.acct_code, v.j_ck_amt, v.j_d_or_c 
         FROM fs_checkmas m
         JOIN fs_checkvou v ON m.j_ck_no = v.j_ck_no
         WHERE (m.company_code = ? OR m.company_code = 'KORNET')
           AND (m.is_deleted IS NULL OR m.is_deleted = 0)
           AND (v.is_deleted IS NULL OR v.is_deleted = 0)`,
      )
      .all(comp) as any[];

    for (const v of vouchers) {
      db.prepare(
        `INSERT INTO fs_pournals (j_jv_no, j_date, acct_code, j_ck_amt, j_d_or_c, company_code, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      ).run(v.j_jv_no, v.j_date, v.acct_code, v.j_ck_amt, v.j_d_or_c, comp);
    }

    res.json({
      success: true,
      postedCount: vouchers.length,
      message: `Successfully committed ${vouchers.length} line items to General Ledger (fs_pournals).`,
    });
  }),
);

router.post(
  '/month-end',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    let sys: any = db.prepare('SELECT * FROM fs_sys_id WHERE company_code = ?').get(comp);
    if (!sys) sys = db.prepare('SELECT * FROM fs_sys_id ORDER BY Id DESC LIMIT 1').get();

    let nextMonth = (sys?.pres_mo ?? 9) + 1;
    let nextYear = sys?.pres_yr ?? 2026;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const begDate = `${nextYear}-${pad(nextMonth)}-01 00:00:00`;
    const lastDay = new Date(nextYear, nextMonth, 0).getDate();
    const endDate = `${nextYear}-${pad(nextMonth)}-${pad(lastDay)} 00:00:00`;

    db.prepare(
      `UPDATE fs_sys_id 
       SET pres_mo = ?, pres_yr = ?, beg_date = ?, end_date = ?, updated_at = datetime('now') 
       WHERE company_code = ?`,
    ).run(nextMonth, nextYear, begDate, endDate, comp);

    res.json({
      success: true,
      currentMonth: nextMonth,
      currentYear: nextYear,
      begDate,
      endDate,
      message: `Fiscal period rolled over to ${nextYear}-${pad(nextMonth)}.`,
    });
  }),
);

// ───────────────────────────────────────────────
// FINANCIAL REPORTS (TRIAL BALANCE, P&L, ETC.)
// ───────────────────────────────────────────────
router.get(
  '/reports/:reportType',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    const { reportType } = req.params;

    let accounts: any[] = db
      .prepare('SELECT * FROM fs_accounts WHERE company_code = ? ORDER BY acct_code ASC')
      .all(comp) as any[];

    if (accounts.length === 0) {
      accounts = db.prepare('SELECT * FROM fs_accounts WHERE company_code = \'KORNET\' ORDER BY acct_code ASC').all() as any[];
    }

    const totalDebits = accounts.reduce((acc, a) => acc + (parseFloat(a.cur_debit || 0) || 0), 0);
    const totalCredits = accounts.reduce((acc, a) => acc + (parseFloat(a.cur_credit || 0) || 0), 0);

    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    let sys: any = db.prepare('SELECT * FROM fs_sys_id WHERE company_code = ?').get(comp);
    if (!sys) sys = db.prepare('SELECT * FROM fs_sys_id ORDER BY Id DESC LIMIT 1').get();
    const periodEnding = sys?.end_date?.slice(0, 10) || '2026-09-30';

    const mappedLines = accounts.map((a) => ({
      accountCode: a.acct_code || '',
      accountDescription: a.acct_desc || '',
      openingBalance: parseFloat(a.open_bal || 0),
      debitMovement: parseFloat(a.cur_debit || 0),
      creditMovement: parseFloat(a.cur_credit || 0),
      endingBalance: parseFloat(a.end_bal || 0),
      transactions: [],
    }));

    res.json({
      reportType,
      companyCode: comp,
      generatedAt: new Date().toISOString(),
      periodEnding,
      data: accounts.map(mapAccount),
      lines: mappedLines,
      inBalance: isBalanced,
      totalDebit: totalDebits,
      totalCredit: totalCredits,
      totals: {
        totalDebits,
        totalCredits,
        isBalanced,
      },
    });
  }),
);

// ───────────────────────────────────────────────
// DATA BROWSER / QUERY VIEWER
// ───────────────────────────────────────────────
router.get(
  '/query/:queryType',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    const qt = req.params.queryType.toLowerCase();

    let table = 'fs_accounts';
    if (qt === 'cdv') table = 'fs_checkmas';
    else if (qt === 'receipt') table = 'fs_cashrcpt';
    else if (qt === 'sales') table = 'fs_salebook';
    else if (qt === 'general') table = 'fs_journals';
    else if (qt === 'purchase') table = 'fs_purcbook';
    else if (qt === 'adjustment') table = 'fs_adjstmnt';

    try {
      const rows = db.prepare(`SELECT * FROM ${table} WHERE (company_code = ? OR company_code = 'KORNET') LIMIT 100`).all(comp);
      res.json({ queryType: qt, count: rows.length, data: rows });
    } catch {
      const fallback = db.prepare(`SELECT * FROM ${table} LIMIT 100`).all();
      res.json({ queryType: qt, count: fallback.length, data: fallback });
    }
  }),
);

// ───────────────────────────────────────────────
// AUTOMATED BRIDGE PIPELINE (DO X IN LOGISTICS → POP UP IN FS AS A CHECK)
// ───────────────────────────────────────────────
router.post(
  '/bridge/create-check',
  asyncHandler(async (req: Request, res: Response) => {
    const comp = getCompany(req);
    const {
      checkNo,
      jvNo,
      date,
      payee,
      amount,
      description,
      bankNo = 1,
      supNo = 0,
      expenseAccount = '5010', // Default: Ocean Freight Carrier Expense
      assetAccount = '1010', // Default: BDO Cash/Bank
      sourceRef,
    } = req.body;

    const numAmount = parseFloat(amount || 0);
    const today = date ? date.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const resolvedCheckNo = checkNo || `CHK-${Math.floor(100000 + Math.random() * 900000)}`;
    const resolvedJvNo = jvNo || `CDV-${today.replace(/-/g, '')}-${resolvedCheckNo.replace(/[^0-9]/g, '')}`;
    const desc = description || `Logistics Operational Settlement Ref: ${sourceRef || 'OPS-DISBURSE'}`;

    // 1. Insert into fs_checkmas (FS Check Master)
    db.prepare(
      `INSERT INTO fs_checkmas (j_jv_no, j_ck_no, j_date, j_pay_to, j_ck_amt, j_desc, bank_no, sup_no, company_code, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
    ).run(resolvedJvNo, resolvedCheckNo, today, payee || 'CARRIER / VENDOR', numAmount, desc, parseInt(bankNo, 10), parseInt(supNo, 10), comp);

    // 2. Insert Balanced Debit line in fs_checkvou (Expense Account)
    db.prepare(
      `INSERT INTO fs_checkvou (j_ck_no, acct_code, j_ck_amt, j_d_or_c, company_code, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, 'D', ?, 0, datetime('now'), datetime('now'))`,
    ).run(resolvedCheckNo, expenseAccount.trim().toUpperCase(), numAmount, comp);

    // 3. Insert Balanced Credit line in fs_checkvou (Bank/Cash Account)
    db.prepare(
      `INSERT INTO fs_checkvou (j_ck_no, acct_code, j_ck_amt, j_d_or_c, company_code, is_deleted, created_at, updated_at)
       VALUES (?, ?, ?, 'C', ?, 0, datetime('now'), datetime('now'))`,
    ).run(resolvedCheckNo, assetAccount.trim().toUpperCase(), numAmount, comp);

    // 4. Also record in Prisma CheckDisbursement in kornet.db for dual-system sync
    try {
      await prisma.checkDisbursement.create({
        data: {
          companyCode: comp,
          checkNo: resolvedCheckNo,
          status: 'Posted',
          payee: payee || 'CARRIER / VENDOR',
          bank: `Bank #${bankNo}`,
          amount: numAmount,
          currency: 'PHP',
          glAccount: expenseAccount,
          memo: desc,
          jeNo: resolvedJvNo,
          postedAt: new Date(),
          createdBy: req.user?.username || 'SYSTEM_BRIDGE',
        },
      });
    } catch (e) {
      console.warn('[fs-bridge] Prisma CheckDisbursement sync notice:', e);
    }

    const createdMaster: any = db
      .prepare('SELECT * FROM fs_checkmas WHERE company_code = ? AND j_ck_no = ?')
      .get(comp, resolvedCheckNo);

    const createdLines = db
      .prepare('SELECT * FROM fs_checkvou WHERE company_code = ? AND j_ck_no = ?')
      .all(comp, resolvedCheckNo) as any[];

    res.status(201).json({
      success: true,
      message: `Automated Check created in FS! CDV Voucher: ${resolvedJvNo}, Check: ${resolvedCheckNo}`,
      data: {
        master: mapMaster(createdMaster),
        lines: createdLines.map(mapLine),
        balanced: true,
      },
    });
  }),
);

export default router;
