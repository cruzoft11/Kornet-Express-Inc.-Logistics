import 'dotenv/config';
import path from 'node:path';

const isDev = process.env.NODE_ENV !== 'production';

function requiredSecret(name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET', fallback: string): string {
  const value = process.env[name];
  if (!value && !isDev) throw new Error(`${name} is required in production`);
  return value || fallback;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigins: (process.env.CORS_ORIGIN ?? (isDev ? 'http://localhost:3000' : ''))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || '2mb',
  accountingDbPath: process.env.ACCOUNTING_DB_PATH
    ? path.resolve(process.env.ACCOUNTING_DB_PATH)
    : path.resolve(process.cwd(), 'prisma/data/accounting.db'),
  jwt: {
    accessSecret: requiredSecret('JWT_ACCESS_SECRET', 'kornet-dev-access-secret-change-me-at-least-32-bytes'),
    refreshSecret: requiredSecret('JWT_REFRESH_SECRET', 'kornet-dev-refresh-secret-change-me-at-least-32-bytes'),
    accessTtlMin: Number(process.env.ACCESS_TOKEN_TTL_MIN ?? 30),
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 14),
  },
  seed: {
    adminUsername: process.env.SEED_ADMIN_USERNAME || 'admin',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'kornet2000',
  },
  isDev,
};
