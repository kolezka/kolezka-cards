import { Database } from 'bun:sqlite';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import * as schema from '@kc/db/schema';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { nanoid } from 'nanoid';
import { type AnalyticsRange, parseRange, queryAnalytics } from './analytics';

const TEST_DB = resolve(import.meta.dir, '../../.tmp/analytics.test.db');
const HOUR_MS = 60 * 60 * 1000;

let sqlite: Database;
let db: ReturnType<typeof drizzle<typeof schema>>;
let cardId: string;
let otherCardId: string;

const NOW = new Date('2026-05-11T12:00:00Z');

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

  const userId = nanoid(16);
  db.insert(schema.users).values({ id: userId, githubId: 1, login: 'tester' }).run();
  cardId = nanoid(12);
  otherCardId = nanoid(12);
  db.insert(schema.cards)
    .values({
      id: cardId,
      userId,
      slug: 'c1',
      type: 'visit-counter',
      configJson: { type: 'visit-counter' },
    })
    .run();
  db.insert(schema.cards)
    .values({
      id: otherCardId,
      userId,
      slug: 'c2',
      type: 'visit-counter',
      configJson: { type: 'visit-counter' },
    })
    .run();

  const nowHour = Math.floor(NOW.getTime() / HOUR_MS);
  db.insert(schema.impressionBuckets)
    .values({ cardId, hourBucket: nowHour, totalImpressions: 10, uniqueVisits: 4 })
    .run();
  db.insert(schema.impressionBuckets)
    .values({ cardId, hourBucket: nowHour - 1, totalImpressions: 5, uniqueVisits: 2 })
    .run();
  db.insert(schema.impressionBuckets)
    .values({ cardId, hourBucket: nowHour - 50, totalImpressions: 2, uniqueVisits: 1 })
    .run();
  db.insert(schema.impressionBuckets)
    .values({ cardId: otherCardId, hourBucket: nowHour, totalImpressions: 99, uniqueVisits: 99 })
    .run();

  db.insert(schema.visits)
    .values({
      id: nanoid(16),
      cardId,
      fingerprintHash: 'fp-1',
      country: 'PL',
      referrerHost: 'github.com',
      userAgentFamily: 'chrome',
      createdAt: new Date(NOW.getTime() - 30 * 60 * 1000),
    })
    .run();
  db.insert(schema.visits)
    .values({
      id: nanoid(16),
      cardId,
      fingerprintHash: 'fp-2',
      country: 'DE',
      referrerHost: 'github.com',
      userAgentFamily: 'firefox',
      createdAt: new Date(NOW.getTime() - 60 * 60 * 1000),
    })
    .run();
  db.insert(schema.visits)
    .values({
      id: nanoid(16),
      cardId,
      fingerprintHash: 'fp-3',
      country: 'PL',
      referrerHost: null,
      userAgentFamily: 'curl',
      createdAt: new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000),
    })
    .run();
});

afterAll(() => sqlite.close());

describe('parseRange', () => {
  it.each(['24h', '7d', '30d', 'all'] as AnalyticsRange[])('accepts %s', (r) => {
    expect(parseRange(r)).toBe(r);
  });
  it('falls back to 7d for unknown values', () => {
    expect(parseRange('weird')).toBe('7d');
    expect(parseRange(undefined)).toBe('7d');
  });
});

describe('queryAnalytics', () => {
  it('aggregates totals from impression buckets for the requested range', () => {
    const r = queryAnalytics(db, { cardId, range: '24h', now: NOW });
    expect(r.totals.totalImpressions).toBe(15);
    expect(r.totals.uniqueVisits).toBe(6);
    expect(r.series.length).toBeGreaterThan(0);
  });

  it('returns wider totals for range=all', () => {
    const r = queryAnalytics(db, { cardId, range: 'all', now: NOW });
    expect(r.totals.totalImpressions).toBe(17);
  });

  it('scopes to the requested cardId', () => {
    const r = queryAnalytics(db, { cardId: otherCardId, range: 'all', now: NOW });
    expect(r.totals.totalImpressions).toBe(99);
  });

  it('produces referrer + country breakdowns for the visits range', () => {
    const r = queryAnalytics(db, { cardId, range: '24h', now: NOW });
    const refs = Object.fromEntries(r.referrers.map((x) => [x.host ?? '(none)', x.count]));
    expect(refs['github.com']).toBe(2);

    const countries = Object.fromEntries(r.countries.map((x) => [x.country ?? '(none)', x.count]));
    expect(countries.PL).toBe(1);
    expect(countries.DE).toBe(1);
  });

  it('excludes visits older than the range window', () => {
    const r = queryAnalytics(db, { cardId, range: '24h', now: NOW });
    expect(r.referrers.find((x) => x.host === null)).toBeUndefined();
  });
});
