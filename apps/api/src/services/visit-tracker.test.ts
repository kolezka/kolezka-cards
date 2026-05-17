import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import * as schema from '@kc/db/schema';
import { type TestDB, createTestDb } from '@kc/db/testing';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getVisitTotals, trackVisit } from './visit-tracker';

let db: TestDB;
let close: () => Promise<void>;
let cardId: string;
let userId: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());

  userId = nanoid(16);
  cardId = nanoid(12);
  await db.insert(schema.users).values({ id: userId, githubId: 1, login: 'tester' });
  await db.insert(schema.cards).values({
    id: cardId,
    userId,
    slug: 'c',
    type: 'visit-counter',
    configJson: { type: 'visit-counter' },
  });
});

afterAll(async () => {
  await close();
});

describe('trackVisit', () => {
  it('marks the first visit as unique and increments both counters', async () => {
    const r = await trackVisit(db, {
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

  it('counts a repeat fingerprint inside the 12h window as a non-unique impression', async () => {
    const r = await trackVisit(db, {
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

  it('counts a different fingerprint as a new unique', async () => {
    const r = await trackVisit(db, {
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

  it('treats a visit older than the dedup window as a fresh unique', async () => {
    const longAgo = new Date(Date.now() - 13 * 60 * 60 * 1000);
    const r1 = await trackVisit(db, {
      cardId,
      fingerprintHash: 'fp-stale',
      country: null,
      referrerHost: null,
      userAgentFamily: null,
      viaCamo: false,
      now: longAgo,
    });
    expect(r1.wasUnique).toBe(true);

    const r2 = await trackVisit(db, {
      cardId,
      fingerprintHash: 'fp-stale',
      country: null,
      referrerHost: null,
      userAgentFamily: null,
      viaCamo: false,
    });
    expect(r2.wasUnique).toBe(true);
  });

  it('persists viaCamo flag on the visit row and routes impressions correctly', async () => {
    const camoCardId = nanoid(12);
    await db.insert(schema.cards).values({
      id: camoCardId,
      userId,
      slug: 'camo-card',
      type: 'visit-counter',
      configJson: { type: 'visit-counter' },
    });

    await trackVisit(db, {
      cardId: camoCardId,
      fingerprintHash: 'camo-fp-1',
      country: 'US',
      referrerHost: null,
      userAgentFamily: 'camo',
      viaCamo: true,
    });
    await trackVisit(db, {
      cardId: camoCardId,
      fingerprintHash: 'direct-fp-1',
      country: 'PL',
      referrerHost: 'github.com',
      userAgentFamily: 'chrome',
      viaCamo: false,
    });

    const rows = await db
      .select({ fp: schema.visits.fingerprintHash, viaCamo: schema.visits.viaCamo })
      .from(schema.visits)
      .where(eq(schema.visits.cardId, camoCardId));
    expect(rows.find((r) => r.fp === 'camo-fp-1')?.viaCamo).toBe(true);
    expect(rows.find((r) => r.fp === 'direct-fp-1')?.viaCamo).toBe(false);

    const buckets = await db
      .select({
        total: schema.impressionBuckets.totalImpressions,
        direct: schema.impressionBuckets.directImpressions,
        camo: schema.impressionBuckets.camoImpressions,
      })
      .from(schema.impressionBuckets)
      .where(eq(schema.impressionBuckets.cardId, camoCardId));
    const bucket = buckets[0];
    expect(bucket?.total).toBe(2);
    expect(bucket?.direct).toBe(1);
    expect(bucket?.camo).toBe(1);
  });

  it('dedups a repeat Camo fingerprint without inflating uniques', async () => {
    const dedupCardId = nanoid(12);
    await db.insert(schema.cards).values({
      id: dedupCardId,
      userId,
      slug: 'camo-dedup',
      type: 'visit-counter',
      configJson: { type: 'visit-counter' },
    });

    await trackVisit(db, {
      cardId: dedupCardId,
      fingerprintHash: 'dup-fp',
      country: 'US',
      referrerHost: null,
      userAgentFamily: 'camo',
      viaCamo: true,
    });
    const r = await trackVisit(db, {
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

    const buckets = await db
      .select({
        direct: schema.impressionBuckets.directImpressions,
        camo: schema.impressionBuckets.camoImpressions,
      })
      .from(schema.impressionBuckets)
      .where(eq(schema.impressionBuckets.cardId, dedupCardId));
    const bucket = buckets[0];
    expect(bucket?.direct).toBe(0);
    expect(bucket?.camo).toBe(2);
  });
});

describe('getVisitTotals', () => {
  it('returns current totals without mutating any counters', async () => {
    const before = await getVisitTotals(db, cardId);
    expect(before.totalImpressions).toBeGreaterThan(0);
    const after = await getVisitTotals(db, cardId);
    expect(after).toEqual(before);
  });

  it('returns zeros for an unknown cardId', async () => {
    expect(await getVisitTotals(db, 'nope-no-such-card')).toEqual({
      totalImpressions: 0,
      uniqueVisits: 0,
    });
  });
});
