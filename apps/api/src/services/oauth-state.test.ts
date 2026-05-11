import { Database } from 'bun:sqlite';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as schema from '@kc/db/schema';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import {
  OAUTH_STATE_TTL_MS,
  consumeOAuthState,
  createOAuthState,
  sweepExpiredOAuthState,
} from './oauth-state';

const TEST_DB = resolve(import.meta.dir, '../../.tmp/oauth-state.test.db');

let sqlite: Database;
let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(() => {
  mkdirSync(dirname(TEST_DB), { recursive: true });
  for (const suffix of ['', '-shm', '-wal']) {
    if (existsSync(`${TEST_DB}${suffix}`)) rmSync(`${TEST_DB}${suffix}`);
  }
  sqlite = new Database(TEST_DB, { create: true });
  sqlite.run('PRAGMA journal_mode = WAL;');
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(import.meta.dir, '../../../../packages/db/migrations') });
});

afterAll(() => sqlite.close());

describe('oauth-state service', () => {
  it('createOAuthState persists state + verifier with 10-min TTL', () => {
    const now = new Date('2026-05-11T12:00:00Z');
    const { state } = createOAuthState(db, { codeVerifier: 'cv-x', redirectTo: '/app', now });
    expect(state).toMatch(/^[0-9a-zA-Z_-]{16,}$/);

    const row = db
      .select()
      .from(schema.oauthState)
      .all()
      .find((r) => r.state === state)!;
    expect(row.codeVerifier).toBe('cv-x');
    expect(row.redirectTo).toBe('/app');
    expect(row.expiresAt.getTime() - now.getTime()).toBe(OAUTH_STATE_TTL_MS);
  });

  it('consumeOAuthState returns the row once and deletes it (single-use)', () => {
    const { state } = createOAuthState(db, { codeVerifier: 'cv-once', redirectTo: null });
    const first = consumeOAuthState(db, state);
    expect(first?.codeVerifier).toBe('cv-once');
    const second = consumeOAuthState(db, state);
    expect(second).toBeNull();
  });

  it('consumeOAuthState returns null for an expired row and deletes it', () => {
    const expiredState = 'expired-state-id';
    const expired = new Date(Date.now() - OAUTH_STATE_TTL_MS - 1);
    db.insert(schema.oauthState).values({ state: expiredState, expiresAt: expired }).run();
    expect(consumeOAuthState(db, expiredState)).toBeNull();
  });

  it('sweepExpiredOAuthState removes only expired rows', () => {
    const now = new Date();
    const aliveExpiry = new Date(now.getTime() + 5 * 60 * 1000);
    const deadExpiry = new Date(now.getTime() - 1000);
    db.insert(schema.oauthState).values({ state: 'alive-1', expiresAt: aliveExpiry }).run();
    db.insert(schema.oauthState).values({ state: 'dead-1', expiresAt: deadExpiry }).run();
    sweepExpiredOAuthState(db, now);
    const remaining = db.select({ state: schema.oauthState.state }).from(schema.oauthState).all();
    expect(remaining.some((r) => r.state === 'alive-1')).toBe(true);
    expect(remaining.some((r) => r.state === 'dead-1')).toBe(false);
  });
});
