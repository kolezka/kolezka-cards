import { type DB, schema } from '@kc/db';
import type { Env } from '@kc/shared/env';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import {
  clearSessionCookie,
  consumeOAuthStateCookie,
  readSessionCookie,
  setOAuthStateCookie,
  setSessionCookie,
} from '../auth/cookies';
import { fetchGitHubUser, githubProvider } from '../auth/github';
import { logger } from '../logger';
import { bumpCounter } from '../services/metrics';
import { consumeOAuthState, createOAuthState } from '../services/oauth-state';
import { createSession, deleteSession } from '../services/sessions';

export function createAuthRoute(db: DB, env: Env): Hono {
  const app = new Hono();

  app.get('/auth/github', async (c) => {
    const gh = githubProvider(env);
    if (!gh) {
      return c.json({ error: 'oauth_not_configured' }, 503);
    }
    const { state } = createOAuthState(db, { redirectTo: c.req.query('redirect') ?? null });
    setOAuthStateCookie(c, env, state);
    const url = gh.createAuthorizationURL(state, ['read:user']);
    logger.info({ event: 'oauth.start', state: state.slice(0, 8) }, 'oauth start');
    return c.redirect(url.toString(), 302);
  });

  app.get('/auth/github/callback', async (c) => {
    const gh = githubProvider(env);
    if (!gh) return c.json({ error: 'oauth_not_configured' }, 503);

    const code = c.req.query('code');
    const stateQ = c.req.query('state');
    if (!code || !stateQ) return c.json({ error: 'invalid_callback' }, 400);

    const cookieState = consumeOAuthStateCookie(c, env);
    if (!cookieState || cookieState !== stateQ) {
      return c.json({ error: 'state_mismatch' }, 400);
    }
    const stored = consumeOAuthState(db, stateQ);
    if (!stored) return c.json({ error: 'state_expired' }, 400);

    let tokens: { accessToken(): string };
    try {
      tokens = (await gh.validateAuthorizationCode(code)) as never;
    } catch (err) {
      logger.warn({ err }, 'oauth code exchange failed');
      return c.json({ error: 'code_exchange_failed' }, 400);
    }

    let ghUser: { id: number; login: string; avatar_url: string | null };
    try {
      ghUser = await fetchGitHubUser(tokens.accessToken());
    } catch (err) {
      logger.warn({ err }, 'github /user failed');
      return c.json({ error: 'github_user_failed' }, 502);
    }

    const existing = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.githubId, ghUser.id))
      .limit(1)
      .get();

    let userId: string;
    if (existing) {
      userId = existing.id;
      db.update(schema.users)
        .set({ login: ghUser.login, avatarUrl: ghUser.avatar_url })
        .where(eq(schema.users.id, userId))
        .run();
    } else {
      userId = nanoid(16);
      db.insert(schema.users)
        .values({
          id: userId,
          githubId: ghUser.id,
          login: ghUser.login,
          avatarUrl: ghUser.avatar_url,
        })
        .run();
    }

    const { id: sessionId, expiresAt } = createSession(db, {
      userId,
      userAgent: c.req.header('user-agent') ?? null,
    });
    setSessionCookie(c, env, sessionId, expiresAt);
    logger.info({ event: 'oauth.success', userId, githubId: ghUser.id }, 'oauth success');
    bumpCounter('oauth.success');

    const redirectTo = stored.redirectTo?.startsWith('/') ? stored.redirectTo : '/';
    return c.redirect(redirectTo, 302);
  });

  app.post('/auth/logout', async (c) => {
    const sid = readSessionCookie(c);
    if (sid) deleteSession(db, sid);
    clearSessionCookie(c, env);
    return c.json({ ok: true });
  });

  return app;
}
