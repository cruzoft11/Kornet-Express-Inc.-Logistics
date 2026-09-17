import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/auth.js';
import { unauthorized, forbidden, badRequest } from '../lib/http.js';
import { prisma } from '../db.js';

/** Require a valid Bearer access token; attaches req.user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(unauthorized('Missing bearer token'));
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return next(unauthorized('Invalid or expired token'));
  }
}

/** Restrict a route to specific roles. */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (req.user.role === 'superadmin' || roles.includes(req.user.role)) return next();
    return next(forbidden('Insufficient role'));
  };
}

/** Require a company header that belongs to the authenticated user. */
export async function requireCompany(req: Request, _res: Response, next: NextFunction) {
  const code = (req.headers['x-company-code'] as string | undefined)?.trim();
  if (!code) return next(badRequest('Missing X-Company-Code header'));

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.sub },
      select: { active: true, role: true, companies: true },
    });
    if (!user || !user.active) return next(unauthorized('User is inactive or no longer exists'));

    let allowedCompanies: string[] = [];
    try {
      allowedCompanies = JSON.parse(user.companies) as string[];
    } catch {
      return next(forbidden('User company access is invalid'));
    }

    const hasGlobalAccess = user.role === 'superadmin' || allowedCompanies.length === 0;
    if (!hasGlobalAccess && !allowedCompanies.includes(code)) {
      return next(forbidden('User is not assigned to this company'));
    }

    const company = await prisma.company.findFirst({
      where: { code, active: true },
      select: { code: true },
    });
    if (!company) return next(forbidden('Company is inactive or does not exist'));

    req.companyCode = company.code;
    return next();
  } catch (error) {
    return next(error);
  }
}
