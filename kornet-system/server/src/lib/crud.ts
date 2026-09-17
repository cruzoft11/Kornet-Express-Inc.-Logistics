import { Router } from 'express';
import type { Request } from 'express';
import type { ZodType } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler, notFound } from './http.js';
import { requireAuth, requireCompany } from '../middleware/auth.js';

/** Minimal shape of a Prisma model delegate used by the factory. */
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
  entity: string;
  createSchema: ZodType;
  updateSchema: ZodType;
  /** String columns that store JSON — parsed on read, stringified on write. */
  jsonFields?: string[];
  /** Columns searched by the ?q= query param (case-insensitive contains). */
  searchFields?: string[];
  /** Default ordering. */
  orderBy?: Record<string, 'asc' | 'desc'>;
  /** Auto-generate a human reference when the field is empty on create. */
  numbering?: { field: string; prefix: string };
}

function parseJsonFields<T extends Record<string, unknown>>(row: T, fields: string[]): T {
  if (!row) return row;
  const out: Record<string, unknown> = { ...row };
  for (const f of fields) {
    if (typeof out[f] === 'string') {
      try {
        out[f] = JSON.parse(out[f] as string);
      } catch {
        /* leave as-is */
      }
    }
  }
  return out as T;
}

function stringifyJsonFields(data: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const out = { ...data };
  for (const f of fields) {
    if (f in out && typeof out[f] !== 'string' && out[f] !== undefined) {
      out[f] = JSON.stringify(out[f]);
    }
  }
  return out;
}

async function writeAudit(req: Request, action: string, entity: string, entityId: string, detail?: unknown) {
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

async function nextNumber(model: PrismaDelegate, companyCode: string, prefix: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await model.count({ where: { companyCode } });
  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}-${year}-${seq}`;
}

export function createCrudRouter(opts: CrudOptions): Router {
  const {
    model,
    entity,
    createSchema,
    updateSchema,
    jsonFields = [],
    searchFields = [],
    orderBy = { createdAt: 'desc' },
    numbering,
  } = opts;

  const router = Router();
  router.use(requireAuth, requireCompany);

  // LIST
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const companyCode = req.companyCode!;
      const q = (req.query.q as string | undefined)?.trim();
      const page = Math.max(1, Number(req.query.page ?? 1));
      const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize ?? 100)));

      const where: Record<string, unknown> = { companyCode };
      if (q && searchFields.length) {
        where.OR = searchFields.map((f) => ({ [f]: { contains: q } }));
      }

      const [rows, total] = await Promise.all([
        model.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
        model.count({ where }),
      ]);

      res.json({
        data: (rows as Record<string, unknown>[]).map((r) => parseJsonFields(r, jsonFields)),
        total,
        page,
        pageSize,
      });
    }),
  );

  // GET ONE
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const row = await model.findFirst({
        where: { id: req.params.id, companyCode: req.companyCode! },
      });
      if (!row) throw notFound(`${entity} not found`);
      res.json(parseJsonFields(row as Record<string, unknown>, jsonFields));
    }),
  );

  // CREATE
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const companyCode = req.companyCode!;
      const parsed = createSchema.parse(req.body) as Record<string, unknown>;
      const data = stringifyJsonFields(parsed, jsonFields);
      data.companyCode = companyCode;

      if (numbering && (!data[numbering.field] || data[numbering.field] === '')) {
        data[numbering.field] = await nextNumber(model, companyCode, numbering.prefix);
      }

      const created = (await model.create({ data })) as Record<string, unknown>;
      await writeAudit(req, 'create', entity, String(created.id));
      res.status(201).json(parseJsonFields(created, jsonFields));
    }),
  );

  // UPDATE
  router.patch(
    '/:id',
    asyncHandler(async (req, res) => {
      const companyCode = req.companyCode!;
      const existing = await model.findFirst({ where: { id: req.params.id, companyCode } });
      if (!existing) throw notFound(`${entity} not found`);

      const parsed = updateSchema.parse(req.body) as Record<string, unknown>;
      const data = stringifyJsonFields(parsed, jsonFields);
      delete data.companyCode;
      delete data.id;

      const updated = (await model.update({
        where: { id: req.params.id },
        data,
      })) as Record<string, unknown>;
      await writeAudit(req, 'update', entity, req.params.id);
      res.json(parseJsonFields(updated, jsonFields));
    }),
  );

  // DELETE
  router.delete(
    '/:id',
    asyncHandler(async (req, res) => {
      const companyCode = req.companyCode!;
      const existing = await model.findFirst({ where: { id: req.params.id, companyCode } });
      if (!existing) throw notFound(`${entity} not found`);
      await model.delete({ where: { id: req.params.id } });
      await writeAudit(req, 'delete', entity, req.params.id);
      res.status(204).end();
    }),
  );

  return router;
}
