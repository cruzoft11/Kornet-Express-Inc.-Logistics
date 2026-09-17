import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  cors({
    origin: env.corsOrigins.length ? env.corsOrigins : true,
    credentials: true,
  }),
);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));
if (env.isDev) app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'kornet-express-api', time: new Date().toISOString() });
});

app.use('/api', apiRoutes);

// In production, serve the built frontend assets and handle SPA routing
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
  // eslint-disable-next-line no-console
  console.log(`\n  Kornet Express API & Web  →  http://localhost:${env.port}\n`);
});
