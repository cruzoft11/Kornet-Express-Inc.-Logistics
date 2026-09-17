import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler, notFound, conflict } from '../lib/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { hashPassword } from '../lib/auth.js';
import { userCreate, userUpdate } from '../schemas.js';

const router = Router();
router.use(requireAuth, requireRole('manager'));

function publicUser(u: {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
  active: boolean;
  canAccessFs: boolean;
  companies: string;
  lastLoginAt: Date | null;
  createdAt: Date;
}) {
  let companies: string[] = [];
  try {
    companies = JSON.parse(u.companies);
  } catch {
    companies = [];
  }
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    active: u.active,
    canAccessFs: u.canAccessFs,
    companies,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  };
}

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    res.json({ data: users.map(publicUser) });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = userCreate.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { username: body.username } });
    if (exists) throw conflict('Username already taken');
    const user = await prisma.user.create({
      data: {
        username: body.username,
        passwordHash: await hashPassword(body.password),
        fullName: body.fullName,
        email: body.email ?? null,
        role: body.role,
        active: body.active ?? true,
        canAccessFs: body.canAccessFs ?? false,
        companies: JSON.stringify(body.companies ?? []),
      },
    });
    res.status(201).json(publicUser(user));
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const body = userUpdate.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('User not found');
    const data: Record<string, unknown> = {};
    if (body.password) data.passwordHash = await hashPassword(body.password);
    if (body.fullName !== undefined) data.fullName = body.fullName;
    if (body.email !== undefined) data.email = body.email;
    if (body.role !== undefined) data.role = body.role;
    if (body.active !== undefined) data.active = body.active;
    if (body.canAccessFs !== undefined) data.canAccessFs = body.canAccessFs;
    if (body.companies !== undefined) data.companies = JSON.stringify(body.companies);
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    res.json(publicUser(user));
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound('User not found');
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);

export default router;
