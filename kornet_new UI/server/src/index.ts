import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './env.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

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

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`\n  Kornet Express API  →  http://localhost:${env.port}/api\n`);
});
