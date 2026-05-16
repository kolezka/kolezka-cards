import { Database } from 'bun:sqlite';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as schema from '@kc/db/schema';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { nanoid } from 'nanoid';
import { getFollowersHistory, snapshotFollowers } from './followers-history';

const TEST_DB = resolve(import.meta.dir, '../../.tmp/followers-history.test.db');

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

afterAll(() => {
  sqlite?.close();
  for (const suffix of ['', '-shm', '-wal']) {
    if (existsSync(`${TEST_DB}${suffix}`)) rmSync(`${TEST_DB}${suffix}`);
  }
});

describe('snapshotFollowers + getFollowersHistory', () => {
  it('inserts one row per user/day', () => {
    snapshotFollowers(db, userId, 100, new Date('2026-05-10T10:00:00Z'));
    snapshotFollowers(db, userId, 102, new Date('2026-05-11T10:00:00Z'));
    const all = getFollowersHistory(db, userId);
    expect(all).toEqual([
      { day: '2026-05-10', followers: 100 },
      { day: '2026-05-11', followers: 102 },
    ]);
  });

  it('is idempotent within a single UTC day (preserves first value)', () => {
    snapshotFollowers(db, userId, 200, new Date('2026-05-12T10:00:00Z'));
    snapshotFollowers(db, userId, 250, new Date('2026-05-12T23:59:00Z'));
    const all = getFollowersHistory(db, userId);
    const day12 = all.find((r) => r.day === '2026-05-12');
    expect(day12?.followers).toBe(200);
  });

  it('filters by sinceDay (inclusive)', () => {
    const recent = getFollowersHistory(db, userId, '2026-05-11');
    expect(recent.length).toBe(2);
    expect(recent.every((r) => r.day >= '2026-05-11')).toBe(true);
  });

  it('returns empty array for a user with no history', () => {
    const otherUserId = nanoid(16);
    db.insert(schema.users).values({ id: otherUserId, githubId: 2, login: 'other' }).run();
    expect(getFollowersHistory(db, otherUserId)).toEqual([]);
  });
});
