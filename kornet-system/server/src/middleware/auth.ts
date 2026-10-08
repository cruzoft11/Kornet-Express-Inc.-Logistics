import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/auth.js';
import { unauthorized, forbidden } from '../lib/http.js';
import { prisma } from '../db.js';
import { COMPANY_CODE } from '../company.js';

const ROLE_ALIASES: Record<string, string> = {
  operator: 'operations',
  accountant: 'accounting',
};

export function normalizeRole(role: string): string {
  return ROLE_ALIASES[role] ?? role;
}

/** Require a valid bearer token; attaches req.user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next(unauthorized('Missing bearer token'));
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAccessToken(token);
    req.user = { ...payload, role: normalizeRole(payload.role) };
    return next();
  } catch {
    return next(unauthorized('Invalid or expired token'));
  }
}

/** Restrict a route to specific roles. Signature intentionally kept for existing imports. */
export function requireRole(...roles: string[]) {
  const allowed = roles.map(normalizeRole);
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    const role = normalizeRole(req.user.role);
    if (role === 'superadmin' || allowed.includes(role)) return next();
    return next(forbidden('Insufficient role'));
  };
}

/** Set the only company scope used by the Kornet operations system. */
export function requireCompany(req: Request, _res: Response, next: NextFunction) {
  req.companyCode = COMPANY_CODE;
  return next();
}

export async function requireFsAccess(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user?.sub }, select: { role: true, canAccessFs: true, active: true } });
    if (!user || !user.active) return next(unauthorized('User is inactive or no longer exists'));
    const role = normalizeRole(user.role);
    if (role === 'superadmin' || role === 'admin' || user.canAccessFs) return next();
    return next(forbidden('FS access is not enabled for this user'));
  } catch (error) {
    return next(error);
  }
}
