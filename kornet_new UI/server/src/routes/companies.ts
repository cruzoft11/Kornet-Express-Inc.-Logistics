import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler, notFound, conflict } from '../lib/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { companyCreate, companyUpdate } from '../schemas.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { role: true, companies: true },
    });
    if (!user) throw notFound('User not found');

    let allowedCompanies: string[] = [];
    try {
      allowedCompanies = JSON.parse(user.companies) as string[];
    } catch {
      throw conflict('User company access is invalid');
    }

    const companies = await prisma.company.findMany({
      where: {
        active: true,
        ...(user.role === 'superadmin' || allowedCompanies.length === 0
          ? {}
          : { code: { in: allowedCompanies } }),
      },
      orderBy: { name: 'asc' },
    });
    res.json({ data: companies });
  }),
);

router.post(
  '/',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    const body = companyCreate.parse(req.body);
    const exists = await prisma.company.findUnique({ where: { code: body.code } });
    if (exists) throw conflict('Company code already exists');
    const company = await prisma.company.create({
      data: { ...body, active: body.active ?? true },
    });
    res.status(201).json(company);
  }),
);

router.patch(
  '/:id',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    const body = companyUpdate.parse(req.body);
    const existing = await prisma.company.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Company not found');
    const company = await prisma.company.update({ where: { id: req.params.id }, data: body });
    res.json(company);
  }),
);

router.delete(
  '/:id',
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    const existing = await prisma.company.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('Company not found');
    await prisma.company.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

export default router;
