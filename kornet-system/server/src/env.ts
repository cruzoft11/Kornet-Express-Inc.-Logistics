import 'dotenv/config';

const isDev = process.env.NODE_ENV !== 'production';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'kornet-prod-jwt-access-secret-random-32char-safe',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'kornet-prod-jwt-refresh-secret-random-32char-safe',
    accessTtlMin: Number(process.env.ACCESS_TOKEN_TTL_MIN ?? 30),
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 14),
  },
  seed: {
    adminUsername: process.env.SEED_ADMIN_USERNAME || 'admin',
    adminPassword: process.env.SEED_ADMIN_PASSWORD || 'kornet2000',
  },
  isDev,
};
