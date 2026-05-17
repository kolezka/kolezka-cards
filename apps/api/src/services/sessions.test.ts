import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import * as schema from '@kc/db/schema';
import { type TestDB, createTestDb } from '@kc/db/testing';
import { nanoid } from 'nanoid';
import {
  SESSION_REFRESH_THRESHOLD_MS,
  SESSION_TTL_MS,
  createSession,
  deleteSession,
  loadSession,
  refreshSessionIfStale,
} from './sessions';

let db: TestDB;
let close: () => Promise<void>;
let userId: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
  userId = nanoid(16);
  await db.insert(schema.users).values({ id: userId, githubId: 1, login: 'tester' });
});

afterAll(async () => {
  await close();
});

describe('sessions service', () => {
  it('creates a session with 30-day TTL and hashes UA', async () => {
    const now = new Date('2026-05-11T12:00:00Z');
    const { id, expiresAt } = await createSession(db, {
      userId,
      userAgent: 'Mozilla/5.0',
      now,
    });
    expect(id).toMatch(/^[0-9a-zA-Z_-]{16,}$/);
    expect(expiresAt.getTime() - now.getTime()).toBe(SESSION_TTL_MS);

    const rows = await db.select().from(schema.sessions);
    const row = rows[0]!;
    expect(row.userId).toBe(userId);
    expect(row.userAgentHash).not.toBe('Mozilla/5.0');
    expect(row.userAgentHash?.length).toBe(64);
  });

  it('loads a valid session and returns the user row', async () => {
    const { id } = await createSession(db, { userId, userAgent: 'ua-load' });
    const loaded = await loadSession(db, id);
    expect(loaded?.session.id).toBe(id);
    expect(loaded?.user.login).toBe('tester');
  });

  it('returns null for an unknown session id', async () => {
    expect(await loadSession(db, 'unknown-id')).toBeNull();
  });

  it('returns null for an expired session and deletes the row', async () => {
    const expired = new Date(Date.now() - SESSION_TTL_MS - 1);
    const id = nanoid(24);
    await db.insert(schema.sessions).values({ id, userId, expiresAt: expired });
    expect(await loadSession(db, id)).toBeNull();
    const rows = await db.select({ id: schema.sessions.id }).from(schema.sessions);
    expect(rows.some((s) => s.id === id)).toBe(false);
  });

  it('rolling refresh: only extends when within threshold', async () => {
    const now = new Date('2026-05-11T12:00:00Z');
    const { id } = await createSession(db, { userId, userAgent: 'ua-roll', now });

    const noRefresh = await refreshSessionIfStale(db, id, now);
    expect(noRefresh).toBeNull();

    const nearExpiry = new Date(
      now.getTime() + SESSION_TTL_MS - SESSION_REFRESH_THRESHOLD_MS + 1000,
    );
    const refreshed = await refreshSessionIfStale(db, id, nearExpiry);
    expect(refreshed).not.toBeNull();
    expect(refreshed!.expiresAt.getTime() - nearExpiry.getTime()).toBe(SESSION_TTL_MS);
  });

  it('deletes a session', async () => {
    const { id } = await createSession(db, { userId, userAgent: 'ua-delete' });
    await deleteSession(db, id);
    expect(await loadSession(db, id)).toBeNull();
  });
});
