import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { requireAuth, requireCompany } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireCompany);

// GET /api/audit-logs — company-scoped, read-only
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const companyCode = req.companyCode!;
    const entity = (req.query.entity as string | undefined)?.trim();
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize ?? 100)));
    const where: Record<string, unknown> = { companyCode };
    if (entity) where.entity = entity;

    const [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      data: rows.map((r) => ({
        ...r,
        detail: (() => {
          try {
            return JSON.parse(r.detail);
          } catch {
            return {};
          }
        })(),
      })),
      total,
      page,
      pageSize,
    });
  }),
);

export default router;
