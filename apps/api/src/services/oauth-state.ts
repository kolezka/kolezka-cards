import { randomBytes } from 'node:crypto';
import { type DB, schema } from '@kc/db';
import { eq, lt } from 'drizzle-orm';

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export interface CreateOAuthStateInput {
  codeVerifier?: string | null;
  redirectTo?: string | null;
  now?: Date;
}

export interface CreatedOAuthState {
  state: string;
  expiresAt: Date;
}

export function createOAuthState(db: DB, input: CreateOAuthStateInput = {}): CreatedOAuthState {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + OAUTH_STATE_TTL_MS);
  const state = randomBytes(24).toString('base64url');
  db.insert(schema.oauthState)
    .values({
      state,
      codeVerifier: input.codeVerifier ?? null,
      redirectTo: input.redirectTo ?? null,
      expiresAt,
      createdAt: now,
    })
    .run();
  return { state, expiresAt };
}

export function consumeOAuthState(
  db: DB,
  state: string,
  now: Date = new Date(),
): schema.OAuthState | null {
  const row = db
    .select()
    .from(schema.oauthState)
    .where(eq(schema.oauthState.state, state))
    .limit(1)
    .get();
  if (!row) return null;
  db.delete(schema.oauthState).where(eq(schema.oauthState.state, state)).run();
  if (row.expiresAt.getTime() <= now.getTime()) return null;
  return row;
}

export function sweepExpiredOAuthState(db: DB, now: Date = new Date()): void {
  db.delete(schema.oauthState).where(lt(schema.oauthState.expiresAt, now)).run();
}
