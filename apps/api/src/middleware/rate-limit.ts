import type { MiddlewareHandler } from 'hono';
import { logger } from '../logger';
import { bumpCounter } from '../services/metrics';
import { createTokenBucket } from '../services/rate-limiter';

export const ABUSE_CAPACITY = 600;
export const ABUSE_WINDOW_MS = 60 * 1000;

const abuseBucket = createTokenBucket({
  capacity: ABUSE_CAPACITY,
  refillPerMs: ABUSE_CAPACITY / ABUSE_WINDOW_MS,
  idleEvictMs: 10 * 60 * 1000,
});

setInterval(() => abuseBucket.sweep(), 5 * 60 * 1000).unref?.();

export function clientIp(req: { header(name: string): string | undefined }): string {
  return (
    req.header('cf-connecting-ip') ??
    req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

export const renderAbuseLimit: MiddlewareHandler = async (c, next) => {
  const ip = clientIp(c.req);
  const result = abuseBucket.tryTake(ip);
  if (!result.ok) {
    logger.warn({ ip, path: c.req.path }, 'rate limit hit');
    bumpCounter('rate_limit.rejected');
    c.header('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)));
    return c.json({ error: 'rate_limited' }, 429);
  }
  return next();
};

export { abuseBucket as _abuseBucketForTesting };
