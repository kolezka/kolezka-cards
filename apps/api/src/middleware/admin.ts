import { type Env, isAdminLogin } from '@kc/shared/env';
import type { MiddlewareHandler } from 'hono';
import type { SessionContext } from './session';

/**
 * Gate a route to admin users. Must be installed AFTER `requireSession`
 * on the same path — relies on the `user` variable being on the context.
 */
export function requireAdmin(env: Env): MiddlewareHandler<SessionContext> {
  return async (c, next) => {
    const user = c.get('user');
    if (!user || !isAdminLogin(env, user.login)) {
      return c.json({ error: 'forbidden' }, 403);
    }
    await next();
  };
}
