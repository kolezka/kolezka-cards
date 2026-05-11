import { randomBytes } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';

export const noCache: MiddlewareHandler = async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');
  c.header('ETag', `W/"${randomBytes(8).toString('hex')}"`);
};
