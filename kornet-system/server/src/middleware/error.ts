import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiError } from '../lib/http.js';
import { env } from '../env.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'A record with these unique values already exists.' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found.' });
    }
    return res.status(400).json({ error: 'Database request error', details: err.code });
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  if (env.isDev) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }
  res.status(500).json({ error: env.isDev ? message : 'Internal server error' });
}
