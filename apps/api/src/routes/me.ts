import type { DB } from '@kc/db';
import { type Env, isAdminLogin } from '@kc/shared/env';
import { Hono } from 'hono';
import { type SessionContext, requireSession } from '../middleware/session';

export function createMeRoute(db: DB, env: Env): Hono<SessionContext> {
  const app = new Hono<SessionContext>();
  app.use('/api/me', requireSession(db, env));
  app.get('/api/me', (c) => {
    const u = c.get('user');
    return c.json({
      id: u.id,
      githubId: u.githubId,
      login: u.login,
      avatarUrl: u.avatarUrl,
      isAdmin: isAdminLogin(env, u.login),
    });
  });
  return app;
}
