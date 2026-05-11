import type { MiddlewareHandler } from 'hono';

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
      return c.json({ error: 'origin_mismatch' }, 403);
    }
    if (c.req.header('x-requested-by') !== 'web') {
      return c.json({ error: 'missing_csrf_header' }, 403);
    }
    return next();
  };
}
