import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Production first-boot: ensure DB exists and is migrated ──────────────────
if (process.env.NODE_ENV === 'production' || process.env.WEBSITE_SITE_NAME) {
  const serverRoot = [
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '../..'),
  ].find((candidate) => fs.existsSync(path.join(candidate, 'prisma', 'schema.prisma')))
    ?? path.resolve(__dirname, '..');
  console.log('[boot] Backing up and preparing the existing SQLite database.');
  execSync('node scripts/prepare-production-db.mjs', {
    cwd: serverRoot,
    stdio: 'inherit',
    env: { ...process.env },
  });
  console.log('[boot] Applying only data-preserving Prisma schema changes.');
  execSync('npx prisma db push --schema prisma/schema.prisma --skip-generate', {
    cwd: serverRoot,
    stdio: 'inherit',
    env: { ...process.env },
  });
}

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigins.length ? env.corsOrigins : false,
    credentials: true,
  }),
);
app.use(express.json({ limit: env.jsonBodyLimit }));
app.use(express.urlencoded({ extended: true }));
if (env.isDev) app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'kornet-express-api', time: new Date().toISOString() });
});

app.use('/api', apiRoutes);

// Serve the built SPA in production
const clientDistCandidates = [
  path.resolve(__dirname, '../../dist'),
  path.resolve(__dirname, '../dist'),
  path.resolve(process.cwd(), 'dist'),
  path.resolve(process.cwd(), 'kornet-system/dist'),
];
const clientDist = clientDistCandidates.find((d) => fs.existsSync(path.join(d, 'index.html')));

if (clientDist) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`\n  Kornet Express API & Web  →  http://localhost:${env.port}\n`);
});
