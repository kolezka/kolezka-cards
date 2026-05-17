import { Database } from 'bun:sqlite';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { dirname } from 'node:path';
import * as schema from '@kc/db/schema';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { nanoid } from 'nanoid';
import { getVisitTotals, trackVisit } from './visit-tracker';

const TEST_DB = resolve(import.meta.dir, '../../.tmp/visit-tracker.test.db');

let sqlite: Database;
let db: ReturnType<typeof drizzle<typeof schema>>;
let cardId: string;
let userId: string;

beforeAll(() => {
  mkdirSync(dirname(TEST_DB), { recursive: true });
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
  if (existsSync(`${TEST_DB}-shm`)) rmSync(`${TEST_DB}-shm`);
  if (existsSync(`${TEST_DB}-wal`)) rmSync(`${TEST_DB}-wal`);

  sqlite = new Database(TEST_DB, { create: true });
  sqlite.run('PRAGMA journal_mode = WAL;');
  sqlite.run('PRAGMA foreign_keys = ON;');
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(import.meta.dir, '../../../../packages/db/migrations') });

  userId = nanoid(16);
  cardId = nanoid(12);
  db.insert(schema.users).values({ id: userId, githubId: 1, login: 'tester' }).run();
  db.insert(schema.cards)
    .values({
      id: cardId,
      userId,
      slug: 'c',
      type: 'visit-counter',
      configJson: { type: 'visit-counter' },
    })
    .run();
});

afterAll(() => {
  sqlite.close();
});

describe('trackVisit', () => {
  it('marks the first visit as unique and increments both counters', () => {
    const r = trackVisit(db, {
      cardId,
      fingerprintHash: 'fp-a',
      country: 'PL',
      referrerHost: 'github.com',
      userAgentFamily: 'firefox',
      viaCamo: false,
    });
    expect(r.wasUnique).toBe(true);
    expect(r.totalImpressions).toBe(1);
    expect(r.uniqueVisits).toBe(1);
  });

  it('counts a repeat fingerprint inside the 12h window as a non-unique impression', () => {
    const r = trackVisit(db, {
      cardId,
      fingerprintHash: 'fp-a',
      country: 'PL',
      referrerHost: 'github.com',
      userAgentFamily: 'firefox',
      viaCamo: false,
    });
    expect(r.wasUnique).toBe(false);
    expect(r.totalImpressions).toBe(2);
    expect(r.uniqueVisits).toBe(1);
  });

  it('counts a different fingerprint as a new unique', () => {
    const r = trackVisit(db, {
      cardId,
      fingerprintHash: 'fp-b',
      country: 'DE',
      referrerHost: null,
      userAgentFamily: 'chrome',
      viaCamo: false,
    });
    expect(r.wasUnique).toBe(true);
    expect(r.totalImpressions).toBe(3);
    expect(r.uniqueVisits).toBe(2);
  });

  it('treats a visit older than the dedup window as a fresh unique', () => {
    const longAgo = new Date(Date.now() - 13 * 60 * 60 * 1000);
    const r1 = trackVisit(db, {
      cardId,
      fingerprintHash: 'fp-stale',
      country: null,
      referrerHost: null,
      userAgentFamily: null,
      viaCamo: false,
      now: longAgo,
    });
    expect(r1.wasUnique).toBe(true);

    const r2 = trackVisit(db, {
      cardId,
      fingerprintHash: 'fp-stale',
      country: null,
      referrerHost: null,
      userAgentFamily: null,
      viaCamo: false,
    });
    expect(r2.wasUnique).toBe(true);
  });

  it('persists viaCamo flag on the visit row and routes impressions correctly', () => {
    // Use a dedicated card so we can assert exact counter values
    // without interference from the shared-card tests above.
    const camoCardId = nanoid(12);
    db.insert(schema.cards)
      .values({
        id: camoCardId,
        userId,
        slug: 'camo-card',
        type: 'visit-counter',
        configJson: { type: 'visit-counter' },
      })
      .run();

    // First: a Camo-proxied visit. Goes into camo_impressions only.
    trackVisit(db, {
      cardId: camoCardId,
      fingerprintHash: 'camo-fp-1',
      country: 'US',
      referrerHost: null,
      userAgentFamily: 'camo',
      viaCamo: true,
    });
    // Second: a direct visit with a different fingerprint. Goes into direct_impressions.
    trackVisit(db, {
      cardId: camoCardId,
      fingerprintHash: 'direct-fp-1',
      country: 'PL',
      referrerHost: 'github.com',
      userAgentFamily: 'chrome',
      viaCamo: false,
    });

    const rows = db
      .select({
        fp: schema.visits.fingerprintHash,
        viaCamo: schema.visits.viaCamo,
      })
      .from(schema.visits)
      .where(eq(schema.visits.cardId, camoCardId))
      .all();
    expect(rows.find((r) => r.fp === 'camo-fp-1')?.viaCamo).toBe(true);
    expect(rows.find((r) => r.fp === 'direct-fp-1')?.viaCamo).toBe(false);

    const bucket = db
      .select({
        total: schema.impressionBuckets.totalImpressions,
        direct: schema.impressionBuckets.directImpressions,
        camo: schema.impressionBuckets.camoImpressions,
      })
      .from(schema.impressionBuckets)
      .where(eq(schema.impressionBuckets.cardId, camoCardId))
      .get();
    expect(bucket?.total).toBe(2);
    expect(bucket?.direct).toBe(1);
    expect(bucket?.camo).toBe(1);
  });

  it('dedups a repeat Camo fingerprint without inflating uniques', () => {
    const dedupCardId = nanoid(12);
    db.insert(schema.cards)
      .values({
        id: dedupCardId,
        userId,
        slug: 'camo-dedup',
        type: 'visit-counter',
        configJson: { type: 'visit-counter' },
      })
      .run();

    trackVisit(db, {
      cardId: dedupCardId,
      fingerprintHash: 'dup-fp',
      country: 'US',
      referrerHost: null,
      userAgentFamily: 'camo',
      viaCamo: true,
    });
    const r = trackVisit(db, {
      cardId: dedupCardId,
      fingerprintHash: 'dup-fp',
      country: 'US',
      referrerHost: null,
      userAgentFamily: 'camo',
      viaCamo: true,
    });
    expect(r.wasUnique).toBe(false);
    expect(r.totalImpressions).toBe(2);
    expect(r.uniqueVisits).toBe(1);

    const bucket = db
      .select({
        direct: schema.impressionBuckets.directImpressions,
        camo: schema.impressionBuckets.camoImpressions,
      })
      .from(schema.impressionBuckets)
      .where(eq(schema.impressionBuckets.cardId, dedupCardId))
      .get();
    expect(bucket?.direct).toBe(0);
    expect(bucket?.camo).toBe(2);
  });
});

describe('getVisitTotals', () => {
  it('returns current totals without mutating any counters', () => {
    const before = getVisitTotals(db, cardId);
    expect(before.totalImpressions).toBeGreaterThan(0);

    // Calling again must produce the exact same numbers — no side effects.
    const after = getVisitTotals(db, cardId);
    expect(after).toEqual(before);
  });

  it('returns zeros for an unknown cardId', () => {
    expect(getVisitTotals(db, 'nope-no-such-card')).toEqual({
      totalImpressions: 0,
      uniqueVisits: 0,
    });
  });
});
