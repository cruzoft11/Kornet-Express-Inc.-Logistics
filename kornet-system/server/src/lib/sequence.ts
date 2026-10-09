import type { Prisma, PrismaClient } from '@prisma/client';

type Tx = Prisma.TransactionClient | PrismaClient;

const SPECS: Record<string, { prefix: string; width: number; year?: 'YYYY' | 'YY' | false; sep?: string }> = {
  OE: { prefix: 'OE', year: 'YYYY', width: 5 },
  OI: { prefix: 'OI', year: 'YYYY', width: 5 },
  AE: { prefix: 'AE', year: 'YYYY', width: 5 },
  AI: { prefix: 'AI', year: 'YYYY', width: 5 },
  DT: { prefix: 'DT', year: 'YYYY', width: 5 },
  QUOTE: { prefix: 'QT', year: 'YYYY', width: 5 },
  BOOKING: { prefix: 'BK', year: 'YYYY', width: 5 },
  HBL: { prefix: 'KEX', year: 'YY', width: 6, sep: '' },
  HAWB: { prefix: 'KEX', year: false, width: 8 },
  PD: { prefix: 'PD', year: 'YYYY', width: 5 },
  WR: { prefix: 'WR', year: 'YYYY', width: 5 },
  INSPECTION: { prefix: 'INSP', year: 'YYYY', width: 5 },
  INVOICE: { prefix: 'SI', year: 'YYYY', width: 6 },
  CREDIT_MEMO: { prefix: 'CM', year: 'YYYY', width: 6 },
  AP_BILL: { prefix: 'AP', year: 'YYYY', width: 6 },
  CHECK: { prefix: 'CV', year: 'YYYY', width: 6 },
  RECEIPT: { prefix: 'CR', year: 'YYYY', width: 6 },
  JOURNAL: { prefix: 'JV', year: 'YYYY', width: 6 },
};

export function sequenceKeyForShipment(mode?: string, direction?: string): string {
  const m = String(mode || 'OCEAN').toUpperCase();
  const d = String(direction || 'EXPORT').toUpperCase();
  if (m === 'AIR') return d === 'IMPORT' ? 'AI' : 'AE';
  if (m === 'DOMESTIC' || d === 'DOMESTIC') return 'DT';
  return d === 'IMPORT' ? 'OI' : 'OE';
}

export async function nextNumber(tx: Tx, companyCode: string, key: string, at: Date = new Date()): Promise<string> {
  const normalized = key.toUpperCase();
  const spec = SPECS[normalized] ?? { prefix: normalized, year: 'YYYY' as const, width: 5 };
  const year = at.getFullYear();
  const row = await tx.sequence.upsert({
    where: { companyCode_key_year: { companyCode, key: normalized, year } },
    create: { companyCode, key: normalized, year, next: 2 },
    update: { next: { increment: 1 } },
  });
  const n = row.next - 1;
  const seq = String(n).padStart(spec.width, '0');
  if (spec.year === false) return `${spec.prefix}-${seq}`;
  const y = spec.year === 'YY' ? String(year).slice(-2) : String(year);
  const sep = spec.sep ?? '-';
  if (spec.sep === '') return `${spec.prefix}${y}${seq}`;
  return `${spec.prefix}${sep}${y}${sep}${seq}`;
}
