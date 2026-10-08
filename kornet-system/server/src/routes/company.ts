import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { COMPANY_CODE } from '../company.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const company = await prisma.company.findFirst({
      where: { code: COMPANY_CODE, active: true },
    });
    res.json({ data: company });
  }),
);

export default router;
