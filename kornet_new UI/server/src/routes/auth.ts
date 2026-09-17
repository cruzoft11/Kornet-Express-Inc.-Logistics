import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler, unauthorized, notFound } from '../lib/http.js';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  generateRefreshToken,
  hashToken,
  refreshExpiry,
} from '../lib/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { loginSchema, refreshSchema } from '../schemas.js';

const router = Router();

const loginAttempts = new Map<string, { failures: number; firstFailureAt: number; blockedUntil: number }>();
const MAX_LOGIN_FAILURES = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_BLOCK_MS = 60 * 1000;

function loginAttemptKey(req: { ip?: string }, username: string): string {
  return `${req.ip || 'unknown'}:${username.trim().toLowerCase()}`;
}

function isLoginBlocked(key: string): boolean {
  const attempt = loginAttempts.get(key);
  if (!attempt) return false;
  if (attempt.blockedUntil > Date.now()) return true;
  if (attempt.blockedUntil || Date.now() - attempt.firstFailureAt > LOGIN_WINDOW_MS) loginAttempts.delete(key);
  return false;
}

function recordLoginFailure(key: string): void {
  const now = Date.now();
  const current = loginAttempts.get(key);
  const inWindow = current && now - current.firstFailureAt <= LOGIN_WINDOW_MS;
  const next = inWindow ? current.failures + 1 : 1;
  loginAttempts.set(key, {
    failures: next,
    firstFailureAt: inWindow ? current.firstFailureAt : now,
    blockedUntil: next >= MAX_LOGIN_FAILURES ? now + LOGIN_BLOCK_MS : 0,
  });
}

function publicUser(u: {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
  active: boolean;
  canAccessFs: boolean;
  companies: string;
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
  };
}

async function issueTokens(user: { id: string; username: string; role: string }) {
  const accessToken = signAccessToken({ sub: user.id, username: user.username, role: user.role });
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiry(),
    },
  });
  return { accessToken, refreshToken };
}

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);
    const attemptKey = loginAttemptKey(req, username);
    if (isLoginBlocked(attemptKey)) throw unauthorized('Invalid credentials');

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.active) {
      recordLoginFailure(attemptKey);
      throw unauthorized('Invalid credentials');
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      recordLoginFailure(attemptKey);
      throw unauthorized('Invalid credentials');
    }

    loginAttempts.delete(attemptKey);

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const tokens = await issueTokens(user);
    res.json({ user: publicUser(user), ...tokens });
  }),
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
    });
    if (!record || record.revoked || record.expiresAt < new Date()) {
      throw unauthorized('Invalid refresh token');
    }
    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    if (!user || !user.active) throw unauthorized('Invalid refresh token');

    // Rotate: revoke the used token, issue a fresh pair.
    await prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });
    const tokens = await issueTokens(user);
    res.json({ user: publicUser(user), ...tokens });
  }),
);

// POST /api/auth/logout
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (parsed.success) {
      await prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(parsed.data.refreshToken) },
        data: { revoked: true },
      });
    }
    res.status(204).end();
  }),
);

// GET /api/auth/me
router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw notFound('User not found');
    res.json(publicUser(user));
  }),
);

// POST /api/auth/change-password
router.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const current = String(req.body?.currentPassword ?? '');
    const next = String(req.body?.newPassword ?? '');
    if (next.length < 6) throw unauthorized('New password too short');
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user) throw notFound('User not found');
    const ok = await verifyPassword(current, user.passwordHash);
    if (!ok) throw unauthorized('Current password is incorrect');
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(next) },
    });
    res.status(204).end();
  }),
);

export default router;
