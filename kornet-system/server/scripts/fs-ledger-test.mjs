import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const source = path.resolve('prisma/data/accounting.db');
const copy = path.resolve('prisma/data/accounting-ledger-test.db');
const runner = path.resolve('scripts/.fs-ledger-test-runner.ts');
fs.copyFileSync(source, copy);
try {
  const coa = spawnSync(process.execPath, ['scripts/fs-kornet-coa.mjs'], { env: { ...process.env, ACCOUNTING_DB_PATH: copy }, encoding: 'utf8' });
  if (coa.status !== 0) throw new Error(coa.stderr || coa.stdout || coa.error?.message);
  fs.writeFileSync(runner, `
    import * as ledger from '../src/lib/fsLedger.ts';
    const period = ledger.getPeriod('KORNET');
    if (!period) throw new Error('missing KORNET period');
    const ref = 'LEDGER-TEST-' + Date.now();
    const entry = { companyCode:'KORNET', journal:'JV' as const, refNo:ref, date:period.begDate, description:'ledger smoke test', lines:[{acctCode:'1130',dc:'D' as const,amount:125.25},{acctCode:'2117',dc:'C' as const,amount:125.25}], userId:'script' };
    const trial = ledger.trialPost(entry); if (!trial.ok) throw new Error(trial.errors.join('; '));
    const first = ledger.finalPost(entry); const second = ledger.finalPost(entry); if (first.jvNo !== second.jvNo) throw new Error('idempotency failed');
    const reversal = ledger.reverse(entry.refNo, entry.companyCode, entry.date, 'script');
    const tb = ledger.trialPost({ ...entry, refNo:'TB-CHECK-' + Date.now() }); if (!tb.ok) throw new Error('trial post failed after reverse');
    ledger.closeLedgerDb();
    console.log(JSON.stringify({ trial, first, second, reversal }, null, 2));
  `);
  const tsxCli = path.resolve('node_modules/tsx/dist/cli.mjs');
  const run = spawnSync(process.execPath, [tsxCli, runner], { env: { ...process.env, ACCOUNTING_DB_PATH: copy }, encoding: 'utf8' });
  if (run.status !== 0) throw new Error(run.stderr || run.stdout || run.error?.message || 'ledger test failed');
  console.log(run.stdout.trim());
} finally {
  try { fs.unlinkSync(runner); } catch {}
  try { fs.unlinkSync(copy); } catch {}
}
