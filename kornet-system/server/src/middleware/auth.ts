import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/auth.js';
import { unauthorized, forbidden } from '../lib/http.js';
import { prisma } from '../db.js';

const ROLE_ALIASES: Record<string, string> = {
  operator: 'operations',
  accountant: 'accounting',
};

export function normalizeRole(role: string): string {
  return ROLE_ALIASES[role] ?? role;
}

function parseCompanies(raw: string): string[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error('invalid companies');
  return parsed.map((c) => String(c).trim().toUpperCase()).filter(Boolean);
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

/** Derive company from authenticated user; optional X-Company-Code is validated. */
export async function requireCompany(req: Request, _res: Response, next: NextFunction) {
  const rawRequested = (req.headers['x-company-code'] as string | undefined)?.trim();
  const requested = rawRequested && !/^(undefined|null)$/i.test(rawRequested)
    ? rawRequested.toUpperCase()
    : undefined;

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.sub },
      select: { active: true, role: true, companies: true, canAccessFs: true },
    });
    if (!user || !user.active) return next(unauthorized('User is inactive or no longer exists'));

    let allowedCompanies: string[];
    try {
      allowedCompanies = parseCompanies(user.companies);
    } catch {
      return next(forbidden('User company access is invalid'));
    }

    const role = normalizeRole(user.role);
    const hasGlobalAccess = role === 'superadmin' || allowedCompanies.length === 0;
    const code = requested || allowedCompanies[0] || 'KORNET';
    if (!hasGlobalAccess && !allowedCompanies.includes(code)) return next(forbidden('User is not assigned to this company'));

    const company = await prisma.company.findFirst({ where: { code, active: true }, select: { code: true } });
    if (!company) return next(forbidden('Company is inactive or does not exist'));

    req.companyCode = company.code;
    return next();
  } catch (error) {
    return next(error);
  }
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
