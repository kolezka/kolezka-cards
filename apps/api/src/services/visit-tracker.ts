import { type DB, schema } from '@kc/db';
import { and, eq, gte, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const DEDUP_WINDOW_MS = 12 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export interface VisitInput {
  cardId: string;
  fingerprintHash: string;
  country: string | null;
  referrerHost: string | null;
  userAgentFamily: string | null;
  now?: Date;
}

export interface VisitResult {
  wasUnique: boolean;
  totalImpressions: number;
  uniqueVisits: number;
}

export function trackVisit(db: DB, input: VisitInput): VisitResult {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const hourBucket = Math.floor(nowMs / HOUR_MS);
  const windowStart = new Date(nowMs - DEDUP_WINDOW_MS);

  const recent = db
    .select({ id: schema.visits.id })
    .from(schema.visits)
    .where(
      and(
        eq(schema.visits.cardId, input.cardId),
        eq(schema.visits.fingerprintHash, input.fingerprintHash),
        gte(schema.visits.createdAt, windowStart),
      ),
    )
    .limit(1)
    .all();

  const wasUnique = recent.length === 0;

  if (wasUnique) {
    db.insert(schema.visits)
      .values({
        id: nanoid(16),
        cardId: input.cardId,
        fingerprintHash: input.fingerprintHash,
        country: input.country,
        referrerHost: input.referrerHost,
        userAgentFamily: input.userAgentFamily,
        createdAt: now,
      })
      .run();
  }

  db.insert(schema.impressionBuckets)
    .values({
      cardId: input.cardId,
      hourBucket,
      totalImpressions: 1,
      uniqueVisits: wasUnique ? 1 : 0,
    })
    .onConflictDoUpdate({
      target: [schema.impressionBuckets.cardId, schema.impressionBuckets.hourBucket],
      set: {
        totalImpressions: sql`${schema.impressionBuckets.totalImpressions} + 1`,
        uniqueVisits: wasUnique
          ? sql`${schema.impressionBuckets.uniqueVisits} + 1`
          : schema.impressionBuckets.uniqueVisits,
      },
    })
    .run();

  const totals = db
    .select({
      totalImpressions: sql<number>`COALESCE(SUM(${schema.impressionBuckets.totalImpressions}), 0)`,
      uniqueVisits: sql<number>`COALESCE(SUM(${schema.impressionBuckets.uniqueVisits}), 0)`,
    })
    .from(schema.impressionBuckets)
    .where(eq(schema.impressionBuckets.cardId, input.cardId))
    .get();

  return {
    wasUnique,
    totalImpressions: Number(totals?.totalImpressions ?? 0),
    uniqueVisits: Number(totals?.uniqueVisits ?? 0),
  };
}
