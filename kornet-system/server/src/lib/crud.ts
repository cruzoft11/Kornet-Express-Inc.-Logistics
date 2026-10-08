import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler, conflict, notFound } from './http.js';
import { requireAuth, requireCompany, requireRole } from '../middleware/auth.js';
import { nextNumber, sequenceKeyForShipment } from './sequence.js';
import { assertShipmentMutable, assertChargeMutable } from '../services/domain.js';

export interface PrismaDelegate {
  findMany(args: unknown): Promise<unknown[]>;
  findFirst(args: unknown): Promise<unknown | null>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  delete(args: unknown): Promise<unknown>;
  count(args: unknown): Promise<number>;
}

export interface CrudOptions {
  model: PrismaDelegate;
  modelName?: string;
  entity: string;
  createSchema: ZodType;
  updateSchema: ZodType;
  jsonFields?: string[];
  searchFields?: string[];
  orderBy?: Record<string, 'asc' | 'desc'>;
  numbering?: { field: string; key: string; prefix?: string };
  writeRoles?: string[];
  include?: Record<string, unknown>;
  softDelete?: boolean;
  afterWrite?: (row: Record<string, unknown>, action: string, req: Request) => Promise<void>;
}

const LOCKED = new Set(['CLOSED', 'POSTED', 'VOID']);

function parseJsonFields<T extends Record<string, unknown>>(row: T, fields: string[]): T {
  if (!row) return row;
  const out: Record<string, unknown> = { ...row };
  for (const f of fields) {
    if (typeof out[f] === 'string') {
      try { out[f] = JSON.parse(out[f] as string); } catch { /* leave as-is */ }
    }
  }
  return out as T;
}

function stringifyJsonFields(data: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const out = { ...data };
  for (const f of fields) {
    if (f in out && typeof out[f] !== 'string' && out[f] !== undefined) out[f] = JSON.stringify(out[f]);
  }
  return out;
}

function writeGuard(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => requireRole(...roles)(req, res, next);
}

function injectCompanyCode(obj: unknown, companyCode: string): void {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const item of obj) injectCompanyCode(item, companyCode);
    return;
  }
  const record = obj as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (key === 'create') {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item && typeof item === 'object') {
            (item as Record<string, unknown>).companyCode = companyCode;
            injectCompanyCode(item, companyCode);
          }
        }
      } else if (value && typeof value === 'object') {
        (value as Record<string, unknown>).companyCode = companyCode;
        injectCompanyCode(value, companyCode);
      }
    } else if (value && typeof value === 'object') {
      injectCompanyCode(value, companyCode);
    }
  }
}

export async function writeAudit(req: Request, action: string, entity: string, entityId: string, detail?: unknown) {
  try {
    await prisma.auditLog.create({
      data: {
        companyCode: req.companyCode ?? 'UNKNOWN',
        userId: req.user?.sub,
        username: req.user?.username,
        action,
        entity,
        entityId,
        detail: JSON.stringify(detail ?? {}),
      },
    });
  } catch {
    /* auditing must never break the request */
  }
}

function normalizeStatus(value: unknown): string | undefined {
  return typeof value === 'string' ? value.toUpperCase() : undefined;
}

function parseOrder(sort: unknown, fallback: Record<string, 'asc' | 'desc'>) {
  if (typeof sort !== 'string' || !sort.trim()) return fallback;
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return { [field]: desc ? 'desc' : 'asc' };
}

function buildWhere(req: Request, searchFields: string[]) {
  const companyCode = req.companyCode!;
  const q = (req.query.q as string | undefined)?.trim();
  const where: Record<string, unknown> = { companyCode };
  for (const f of ['status', 'mode', 'direction']) {
    if (typeof req.query[f] === 'string' && req.query[f]) where[f] = req.query[f];
  }
  if (req.query.dateFrom || req.query.dateTo) {
    const field = typeof req.query.dateField === 'string' ? req.query.dateField : 'date';
    const range: Record<string, Date> = {};
    if (typeof req.query.dateFrom === 'string') range.gte = new Date(req.query.dateFrom);
    if (typeof req.query.dateTo === 'string') range.lte = new Date(req.query.dateTo);
    where[field] = range;
  }
  if (q && searchFields.length) where.OR = searchFields.map((f) => ({ [f]: { contains: q } }));
  return where;
}

export function createCrudRouter(opts: CrudOptions): Router {
  const {
    model,
    modelName,
    entity,
    createSchema,
    updateSchema,
    jsonFields = [],
    searchFields = [],
    orderBy = { createdAt: 'desc' },
    numbering,
    writeRoles = ['operations', 'accounting', 'manager', 'admin'],
    include,
    softDelete = false,
    afterWrite,
  } = opts;

  const router = Router();
  router.use(requireAuth, requireCompany);

  router.get('/', asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize ?? 100)));
    const where = buildWhere(req, searchFields);
    const includeArg = req.query.include === 'relations' ? include : undefined;
    const [rows, total] = await Promise.all([
      model.findMany({ where, include: includeArg, orderBy: parseOrder(req.query.sort, orderBy), skip: (page - 1) * pageSize, take: pageSize }),
      model.count({ where }),
    ]);
    res.json({ data: (rows as Record<string, unknown>[]).map((r) => parseJsonFields(r, jsonFields)), total, page, pageSize });
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const row = await model.findFirst({ where: { id: req.params.id, companyCode: req.companyCode! }, include: include ?? (req.query.include === 'relations' ? include : undefined) });
    if (!row) throw notFound(`${entity} not found`);
    res.json(parseJsonFields(row as Record<string, unknown>, jsonFields));
  }));

  router.post('/', writeGuard(writeRoles), asyncHandler(async (req, res) => {
    const companyCode = req.companyCode!;
    const parsed = createSchema.parse(req.body) as Record<string, unknown>;
    const base = stringifyJsonFields(parsed, jsonFields);
    base.companyCode = companyCode;
    injectCompanyCode(base, companyCode);
    await assertShipmentMutable(base.shipmentId as string | undefined, companyCode);
    if (entity === 'Charge') { base.billStatus ??= 'OPEN'; base.costStatus ??= 'OPEN'; }
    base.createdBy = req.user?.sub;
    const created = modelName
      ? await prisma.$transaction(async (tx) => {
          const data = { ...base };
          if (entity === 'Shipment' && (!data.fileNo || data.fileNo === '')) data.fileNo = await nextNumber(tx, companyCode, sequenceKeyForShipment(String(data.mode ?? 'OCEAN'), String(data.direction ?? 'EXPORT')));
          if (numbering && (!data[numbering.field] || data[numbering.field] === '')) data[numbering.field] = await nextNumber(tx, companyCode, numbering.key);
          return ((tx as unknown as Record<string, PrismaDelegate>)[modelName]).create({ data });
        })
      : await model.create({ data: base });
    await writeAudit(req, 'create', entity, String((created as { id: string }).id), { after: created });
    if (afterWrite) await afterWrite(created as Record<string, unknown>, 'create', req);
    res.status(201).json(parseJsonFields(created as Record<string, unknown>, jsonFields));
  }));

  router.patch('/:id', writeGuard(writeRoles), asyncHandler(async (req, res) => {
    const companyCode = req.companyCode!;
    const existing = await model.findFirst({ where: { id: req.params.id, companyCode } }) as Record<string, unknown> | null;
    if (!existing) throw notFound(`${entity} not found`);
    if (LOCKED.has(normalizeStatus(existing.status) ?? '')) throw conflict(`${entity} is immutable in status ${existing.status}`);
    if ('version' in existing && req.body?.version !== undefined && Number(req.body.version) !== Number(existing.version)) throw conflict('Version mismatch');
    await assertShipmentMutable((existing.shipmentId as string | undefined) ?? (entity === 'Shipment' ? String(existing.id) : undefined), companyCode);
    if (entity === 'Charge') assertChargeMutable(existing as { billStatus?: string; costStatus?: string; status?: string }, req.body as Record<string, unknown>);
    const parsed = updateSchema.parse(req.body) as Record<string, unknown>;
    const data = stringifyJsonFields(parsed, jsonFields);
    delete data.companyCode; delete data.id; delete data.createdAt; delete data.updatedAt;
    injectCompanyCode(data, companyCode);
    if ('version' in existing) data.version = { increment: 1 };
    const updated = await model.update({ where: { id: req.params.id }, data }) as Record<string, unknown>;
    await writeAudit(req, 'update', entity, req.params.id, { before: existing, after: updated });
    if (afterWrite) await afterWrite(updated, 'update', req);
    res.json(parseJsonFields(updated, jsonFields));
  }));

  router.delete('/:id', writeGuard(writeRoles), asyncHandler(async (req, res) => {
    const companyCode = req.companyCode!;
    const existing = await model.findFirst({ where: { id: req.params.id, companyCode } }) as Record<string, unknown> | null;
    if (!existing) throw notFound(`${entity} not found`);
    await assertShipmentMutable((existing.shipmentId as string | undefined) ?? (entity === 'Shipment' ? String(existing.id) : undefined), companyCode);
    if (entity === 'Charge') assertChargeMutable(existing as { billStatus?: string; costStatus?: string; status?: string }, { billingCode: 'delete' });
    const status = normalizeStatus(existing.status);
    if (status && status !== 'DRAFT' && status !== 'OPEN') throw conflict(`Only draft/open ${entity} records can be deleted`);
    if (softDelete) {
      await model.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), version: 'version' in existing ? { increment: 1 } : undefined } });
    } else {
      await model.delete({ where: { id: req.params.id } });
    }
    await writeAudit(req, 'delete', entity, req.params.id, { before: existing });
    if (afterWrite) await afterWrite(existing, 'delete', req);
    res.status(204).end();
  }));

  return router;
}

