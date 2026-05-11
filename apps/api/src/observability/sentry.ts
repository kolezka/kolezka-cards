import type { Env } from '@kc/shared/env';
import { logger } from '../logger';

type AnyErr = unknown;

let capture: (err: AnyErr) => void = () => {};

export async function initSentry(env: Env): Promise<void> {
  if (!env.SENTRY_DSN) return;
  try {
    const mod = (await import('@sentry/node')) as typeof import('@sentry/node');
    mod.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: 0,
    });
    capture = (err) => {
      try {
        mod.captureException(err);
      } catch {
        // never let observability throw
      }
    };
    logger.info('sentry initialized');
  } catch (err) {
    logger.warn({ err }, 'sentry init failed — continuing without sentry');
  }
}

export function captureError(err: AnyErr): void {
  capture(err);
}
