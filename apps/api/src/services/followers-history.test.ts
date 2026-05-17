import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import * as schema from '@kc/db/schema';
import { type TestDB, createTestDb } from '@kc/db/testing';
import { nanoid } from 'nanoid';
import { getFollowersHistory, snapshotFollowers } from './followers-history';

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

describe('snapshotFollowers + getFollowersHistory', () => {
  it('inserts one row per user/day', async () => {
    await snapshotFollowers(db, userId, 100, new Date('2026-05-10T10:00:00Z'));
    await snapshotFollowers(db, userId, 102, new Date('2026-05-11T10:00:00Z'));
    const all = await getFollowersHistory(db, userId);
    expect(all).toEqual([
      { day: '2026-05-10', followers: 100 },
      { day: '2026-05-11', followers: 102 },
    ]);
  });

  it('is idempotent within a single UTC day (preserves first value)', async () => {
    await snapshotFollowers(db, userId, 200, new Date('2026-05-12T10:00:00Z'));
    await snapshotFollowers(db, userId, 250, new Date('2026-05-12T23:59:00Z'));
    const all = await getFollowersHistory(db, userId);
    const day12 = all.find((r) => r.day === '2026-05-12');
    expect(day12?.followers).toBe(200);
  });

  it('filters by sinceDay (inclusive)', async () => {
    const recent = await getFollowersHistory(db, userId, '2026-05-11');
    expect(recent.length).toBe(2);
    expect(recent.every((r) => r.day >= '2026-05-11')).toBe(true);
  });

  it('returns empty array for a user with no history', async () => {
    const otherUserId = nanoid(16);
    await db.insert(schema.users).values({ id: otherUserId, githubId: 2, login: 'other' });
    expect(await getFollowersHistory(db, otherUserId)).toEqual([]);
  });
});
