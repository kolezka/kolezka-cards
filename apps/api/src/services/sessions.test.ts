import { Database } from 'bun:sqlite';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as schema from '@kc/db/schema';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { nanoid } from 'nanoid';
import {
  SESSION_REFRESH_THRESHOLD_MS,
  SESSION_TTL_MS,
  createSession,
  deleteSession,
  loadSession,
  refreshSessionIfStale,
} from './sessions';

const TEST_DB = resolve(import.meta.dir, '../../.tmp/sessions.test.db');

let sqlite: Database;
let db: ReturnType<typeof drizzle<typeof schema>>;
let userId: string;

beforeAll(() => {
  mkdirSync(dirname(TEST_DB), { recursive: true });
  for (const suffix of ['', '-shm', '-wal']) {
    if (existsSync(`${TEST_DB}${suffix}`)) rmSync(`${TEST_DB}${suffix}`);
  }
  sqlite = new Database(TEST_DB, { create: true });
  sqlite.run('PRAGMA journal_mode = WAL;');
  sqlite.run('PRAGMA foreign_keys = ON;');
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(import.meta.dir, '../../../../packages/db/migrations') });
  userId = nanoid(16);
  db.insert(schema.users).values({ id: userId, githubId: 1, login: 'tester' }).run();
});

afterAll(() => sqlite.close());

describe('sessions service', () => {
  it('creates a session with 30-day TTL and hashes UA', () => {
    const now = new Date('2026-05-11T12:00:00Z');
    const { id, expiresAt } = createSession(db, { userId, userAgent: 'Mozilla/5.0', now });
    expect(id).toMatch(/^[0-9a-zA-Z_-]{16,}$/);
    expect(expiresAt.getTime() - now.getTime()).toBe(SESSION_TTL_MS);

    const row = db.select().from(schema.sessions).all()[0]!;
    expect(row.userId).toBe(userId);
    expect(row.userAgentHash).not.toBe('Mozilla/5.0');
    expect(row.userAgentHash?.length).toBe(64);
  });

  it('loads a valid session and returns the user row', () => {
    const { id } = createSession(db, { userId, userAgent: 'ua-load' });
    const loaded = loadSession(db, id);
    expect(loaded?.session.id).toBe(id);
    expect(loaded?.user.login).toBe('tester');
  });

  it('returns null for an unknown session id', () => {
    expect(loadSession(db, 'unknown-id')).toBeNull();
  });

  it('returns null for an expired session and deletes the row', () => {
    const expired = new Date(Date.now() - SESSION_TTL_MS - 1);
    const id = nanoid(24);
    db.insert(schema.sessions).values({ id, userId, expiresAt: expired }).run();
    expect(loadSession(db, id)).toBeNull();
    const rows = db.select({ id: schema.sessions.id }).from(schema.sessions).all();
    expect(rows.some((s) => s.id === id)).toBe(false);
  });

  it('rolling refresh: only extends when within threshold', () => {
    const now = new Date('2026-05-11T12:00:00Z');
    const { id } = createSession(db, { userId, userAgent: 'ua-roll', now });

    const noRefresh = refreshSessionIfStale(db, id, now);
    expect(noRefresh).toBeNull();

    const nearExpiry = new Date(
      now.getTime() + SESSION_TTL_MS - SESSION_REFRESH_THRESHOLD_MS + 1000,
    );
    const refreshed = refreshSessionIfStale(db, id, nearExpiry);
    expect(refreshed).not.toBeNull();
    expect(refreshed!.expiresAt.getTime() - nearExpiry.getTime()).toBe(SESSION_TTL_MS);
  });

  it('deletes a session', () => {
    const { id } = createSession(db, { userId, userAgent: 'ua-delete' });
    deleteSession(db, id);
    expect(loadSession(db, id)).toBeNull();
  });
});
