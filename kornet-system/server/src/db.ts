import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

// Ensure DATABASE_URL is always set before Prisma initialises.
if (!process.env.DATABASE_URL) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const serverRoot = [
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '../..'),
  ].find((candidate) => fs.existsSync(path.join(candidate, 'prisma', 'schema.prisma')))
    ?? process.cwd();
  const fallback = path.join(serverRoot, 'prisma', 'data', 'kornet.db');
  fs.mkdirSync(path.dirname(fallback), { recursive: true });
  process.env.DATABASE_URL = `file:${fallback}`;
  if (process.env.NODE_ENV === 'production') {
    console.warn('[db] DATABASE_URL is missing; using the bundled SQLite database path.');
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
