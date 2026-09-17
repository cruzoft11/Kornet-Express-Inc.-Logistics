import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: string;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: `${env.jwt.accessTtlMin}m`,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

/** A refresh token is an opaque random string; only its hash is stored. */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshExpiry(): Date {
  const d = new Date();
  d.setDate(d.getDate() + env.jwt.refreshTtlDays);
  return d;
}
