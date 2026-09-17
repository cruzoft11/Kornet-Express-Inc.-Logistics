import 'dotenv/config';

const isDev = process.env.NODE_ENV !== 'production';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (!isDev && (v === 'kornet-dev-access-secret-change-me' || v === 'kornet-dev-refresh-secret-change-me')) {
    throw new Error(`Production environment variable ${name} must not use the development default`);
  }
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', isDev ? 'kornet-dev-access-secret-change-me' : undefined),
    refreshSecret: required('JWT_REFRESH_SECRET', isDev ? 'kornet-dev-refresh-secret-change-me' : undefined),
    accessTtlMin: Number(process.env.ACCESS_TOKEN_TTL_MIN ?? 30),
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 14),
  },
  seed: {
    adminUsername: required('SEED_ADMIN_USERNAME', isDev ? 'admin' : undefined),
    adminPassword: required('SEED_ADMIN_PASSWORD', isDev ? 'kornet2000' : undefined),
  },
  isDev,
};
