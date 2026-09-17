import type { AccessTokenPayload } from './lib/auth.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
      companyCode?: string;
    }
  }
}

export {};
