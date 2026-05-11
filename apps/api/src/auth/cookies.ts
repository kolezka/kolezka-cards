import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { SESSION_TTL_MS } from '../services/sessions';

export const SESSION_COOKIE = 'kc_session';
export const OAUTH_STATE_COOKIE = 'kc_oauth_state';

export interface CookieEnvSlice {
  NODE_ENV: 'development' | 'test' | 'production';
}

function isProd(env: CookieEnvSlice): boolean {
  return env.NODE_ENV === 'production';
}

export function setSessionCookie(
  c: Context,
  env: CookieEnvSlice,
  sessionId: string,
  expiresAt: Date,
): void {
  setCookie(c, SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: isProd(env),
    sameSite: 'Lax',
    path: '/',
    expires: expiresAt,
    maxAge: Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  });
}

export function refreshSessionCookieExpiry(
  c: Context,
  env: CookieEnvSlice,
  sessionId: string,
  expiresAt: Date,
): void {
  setSessionCookie(c, env, sessionId, expiresAt);
}

export function clearSessionCookie(c: Context, env: CookieEnvSlice): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/', secure: isProd(env), sameSite: 'Lax' });
}

export function readSessionCookie(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE);
}

export function setOAuthStateCookie(c: Context, env: CookieEnvSlice, state: string): void {
  setCookie(c, OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: isProd(env),
    sameSite: 'Lax',
    path: '/',
    maxAge: 10 * 60,
  });
}

export function consumeOAuthStateCookie(c: Context, env: CookieEnvSlice): string | undefined {
  const v = getCookie(c, OAUTH_STATE_COOKIE);
  deleteCookie(c, OAUTH_STATE_COOKIE, { path: '/', secure: isProd(env), sameSite: 'Lax' });
  return v;
}

export { SESSION_TTL_MS };
