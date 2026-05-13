import type { MiddlewareHandler } from 'hono';
import { logger } from '../logger';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export interface CsrfEnvSlice {
  BASE_URL: string;
}

export function csrfGuard(env: CsrfEnvSlice): MiddlewareHandler {
  const expectedOrigin = new URL(env.BASE_URL).origin;
  return async (c, next) => {
    if (SAFE_METHODS.has(c.req.method)) return next();
    const origin = c.req.header('origin');
    if (origin && origin !== expectedOrigin) {
      logger.warn(
        {
          event: 'csrf.origin_mismatch',
          method: c.req.method,
          path: c.req.path,
          origin,
          expected: expectedOrigin,
        },
        'csrf rejected — Origin header does not match BASE_URL',
      );
      return c.json({ error: 'origin_mismatch' }, 403);
    }
    if (c.req.header('x-requested-by') !== 'web') {
      logger.warn(
        { event: 'csrf.missing_header', method: c.req.method, path: c.req.path, origin },
        'csrf rejected — missing X-Requested-By: web header',
      );
      return c.json({ error: 'missing_csrf_header' }, 403);
    }
    return next();
  };
}
