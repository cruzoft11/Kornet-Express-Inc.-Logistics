import { Router } from 'express';
import authRoutes from './auth.js';
import usersRoutes from './users.js';
import companyRoutes from './company.js';
import auditRoutes from './audit.js';
import supportRoutes from './support.js';
import fsRoutes from './fs.js';
import logisticsRoutes, { portal as portalRoutes } from './logistics.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/company', companyRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/support', supportRoutes);
router.use('/fs', fsRoutes);
router.use('/portal', portalRoutes);
router.use('/', logisticsRoutes);

export default router;
