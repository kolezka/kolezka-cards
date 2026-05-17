import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import * as schema from '@kc/db/schema';
import { type TestDB, createTestDb } from '@kc/db/testing';
import {
  OAUTH_STATE_TTL_MS,
  consumeOAuthState,
  createOAuthState,
  sweepExpiredOAuthState,
} from './oauth-state';

let db: TestDB;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});

afterAll(async () => {
  await close();
});

describe('oauth-state service', () => {
  it('createOAuthState persists state + verifier with 10-min TTL', async () => {
    const now = new Date('2026-05-11T12:00:00Z');
    const { state } = await createOAuthState(db, {
      codeVerifier: 'cv-x',
      redirectTo: '/app',
      now,
    });
    expect(state).toMatch(/^[0-9a-zA-Z_-]{16,}$/);

    const rows = await db.select().from(schema.oauthState);
    const row = rows.find((r) => r.state === state)!;
    expect(row.codeVerifier).toBe('cv-x');
    expect(row.redirectTo).toBe('/app');
    expect(row.expiresAt.getTime() - now.getTime()).toBe(OAUTH_STATE_TTL_MS);
  });

  it('consumeOAuthState returns the row once and deletes it (single-use)', async () => {
    const { state } = await createOAuthState(db, { codeVerifier: 'cv-once', redirectTo: null });
    const first = await consumeOAuthState(db, state);
    expect(first?.codeVerifier).toBe('cv-once');
    const second = await consumeOAuthState(db, state);
    expect(second).toBeNull();
  });

  it('consumeOAuthState returns null for an expired row and deletes it', async () => {
    const expiredState = 'expired-state-id';
    const expired = new Date(Date.now() - OAUTH_STATE_TTL_MS - 1);
    await db.insert(schema.oauthState).values({ state: expiredState, expiresAt: expired });
    expect(await consumeOAuthState(db, expiredState)).toBeNull();
  });

  it('sweepExpiredOAuthState removes only expired rows', async () => {
    const now = new Date();
    const aliveExpiry = new Date(now.getTime() + 5 * 60 * 1000);
    const deadExpiry = new Date(now.getTime() - 1000);
    await db.insert(schema.oauthState).values({ state: 'alive-1', expiresAt: aliveExpiry });
    await db.insert(schema.oauthState).values({ state: 'dead-1', expiresAt: deadExpiry });
    await sweepExpiredOAuthState(db, now);
    const remaining = await db.select({ state: schema.oauthState.state }).from(schema.oauthState);
    expect(remaining.some((r) => r.state === 'alive-1')).toBe(true);
    expect(remaining.some((r) => r.state === 'dead-1')).toBe(false);
  });
});
