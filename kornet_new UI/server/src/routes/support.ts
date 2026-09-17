import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../lib/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { supportTicketCreate } from '../schemas.js';

const router = Router();

// POST /api/support — public: submit a support ticket (persisted, never silently dropped)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = supportTicketCreate.parse(req.body);
    const ticket = await prisma.supportTicket.create({
      data: {
        name: body.name,
        email: body.email ?? null,
        subject: body.subject,
        message: body.message,
      },
    });
    res.status(201).json({ id: ticket.id, status: ticket.status });
  }),
);

// GET /api/support — admin: list tickets
router.get(
  '/',
  requireAuth,
  requireRole('manager'),
  asyncHandler(async (_req, res) => {
    const tickets = await prisma.supportTicket.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ data: tickets });
  }),
);

// PATCH /api/support/:id — admin: update ticket status
router.patch(
  '/:id',
  requireAuth,
  requireRole('manager'),
  asyncHandler(async (req, res) => {
    const status = String(req.body?.status ?? 'open');
    const ticket = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(ticket);
  }),
);

export default router;
