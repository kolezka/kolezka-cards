import { createHash } from 'node:crypto';
import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  base: { service: 'kc-api' },
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export function hashForLog(value: string | undefined | null): string {
  if (!value) return 'none';
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}
