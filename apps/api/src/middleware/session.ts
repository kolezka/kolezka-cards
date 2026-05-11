import type { DB, schema } from '@kc/db';
import type { Env } from '@kc/shared/env';
import type { Env as HonoEnv, MiddlewareHandler } from 'hono';
import { readSessionCookie, refreshSessionCookieExpiry } from '../auth/cookies';
import { loadSession, refreshSessionIfStale } from '../services/sessions';

export interface SessionContext extends HonoEnv {
  Variables: {
    user: schema.User;
    session: schema.Session;
  };
}

export function requireSession(db: DB, env: Env): MiddlewareHandler<SessionContext> {
  return async (c, next) => {
    const sid = readSessionCookie(c);
    if (!sid) return c.json({ error: 'unauthenticated' }, 401);
    const loaded = loadSession(db, sid);
    if (!loaded) return c.json({ error: 'unauthenticated' }, 401);

    const refreshed = refreshSessionIfStale(db, sid);
    if (refreshed) {
      refreshSessionCookieExpiry(c, env, sid, refreshed.expiresAt);
    }

    c.set('user', loaded.user);
    c.set('session', loaded.session);
    await next();
  };
}
