import { type DB, schema } from '@kc/db';
import { and, eq, gte, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { logger } from '../logger';

const DEDUP_WINDOW_MS = 12 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
export const IMPRESSIONS_HOUR_FLAG_THRESHOLD = 10_000;

export interface VisitInput {
  cardId: string;
  fingerprintHash: string;
  country: string | null;
  referrerHost: string | null;
  userAgentFamily: string | null;
  viaCamo: boolean;
  now?: Date;
}

export interface VisitResult {
  wasUnique: boolean;
  totalImpressions: number;
  uniqueVisits: number;
}

export async function trackVisit(db: DB, input: VisitInput): Promise<VisitResult> {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const hourBucket = Math.floor(nowMs / HOUR_MS);
  const windowStart = new Date(nowMs - DEDUP_WINDOW_MS);

  const recent = await db
    .select({ id: schema.visits.id })
    .from(schema.visits)
    .where(
      and(
        eq(schema.visits.cardId, input.cardId),
        eq(schema.visits.fingerprintHash, input.fingerprintHash),
        gte(schema.visits.createdAt, windowStart),
      ),
    )
    .limit(1);

  const wasUnique = recent.length === 0;

  if (wasUnique) {
    await db.insert(schema.visits).values({
      id: nanoid(16),
      cardId: input.cardId,
      fingerprintHash: input.fingerprintHash,
      country: input.country,
      referrerHost: input.referrerHost,
      userAgentFamily: input.userAgentFamily,
      viaCamo: input.viaCamo,
      createdAt: now,
    });
  }

  await db
    .insert(schema.impressionBuckets)
    .values({
      cardId: input.cardId,
      hourBucket,
      totalImpressions: 1,
      uniqueVisits: wasUnique ? 1 : 0,
      directImpressions: input.viaCamo ? 0 : 1,
      camoImpressions: input.viaCamo ? 1 : 0,
    })
    .onConflictDoUpdate({
      target: [schema.impressionBuckets.cardId, schema.impressionBuckets.hourBucket],
      set: {
        totalImpressions: sql`${schema.impressionBuckets.totalImpressions} + 1`,
        uniqueVisits: wasUnique
          ? sql`${schema.impressionBuckets.uniqueVisits} + 1`
          : schema.impressionBuckets.uniqueVisits,
        directImpressions: input.viaCamo
          ? schema.impressionBuckets.directImpressions
          : sql`${schema.impressionBuckets.directImpressions} + 1`,
        camoImpressions: input.viaCamo
          ? sql`${schema.impressionBuckets.camoImpressions} + 1`
          : schema.impressionBuckets.camoImpressions,
      },
    });

  const currentBuckets = await db
    .select({ total: schema.impressionBuckets.totalImpressions })
    .from(schema.impressionBuckets)
    .where(
      and(
        eq(schema.impressionBuckets.cardId, input.cardId),
        eq(schema.impressionBuckets.hourBucket, hourBucket),
      ),
    );
  const currentBucket = currentBuckets[0];
  if (currentBucket && currentBucket.total === IMPRESSIONS_HOUR_FLAG_THRESHOLD) {
    logger.warn(
      { cardId: input.cardId, hourBucket, threshold: IMPRESSIONS_HOUR_FLAG_THRESHOLD },
      'impressions_threshold_exceeded',
    );
  }

  const totalsRows = await db
    .select({
      totalImpressions: sql<number>`COALESCE(SUM(${schema.impressionBuckets.totalImpressions}), 0)`,
      uniqueVisits: sql<number>`COALESCE(SUM(${schema.impressionBuckets.uniqueVisits}), 0)`,
    })
    .from(schema.impressionBuckets)
    .where(eq(schema.impressionBuckets.cardId, input.cardId));
  const totals = totalsRows[0];

  return {
    wasUnique,
    totalImpressions: Number(totals?.totalImpressions ?? 0),
    uniqueVisits: Number(totals?.uniqueVisits ?? 0),
  };
}

// Read-only totals for a card. Used when we want the visit-counter card
// to still render the right numbers for self-traffic we don't want to
// track (e.g. owner previewing in the dashboard).
export async function getVisitTotals(
  db: DB,
  cardId: string,
): Promise<{ totalImpressions: number; uniqueVisits: number }> {
  const rows = await db
    .select({
      totalImpressions: sql<number>`COALESCE(SUM(${schema.impressionBuckets.totalImpressions}), 0)`,
      uniqueVisits: sql<number>`COALESCE(SUM(${schema.impressionBuckets.uniqueVisits}), 0)`,
    })
    .from(schema.impressionBuckets)
    .where(eq(schema.impressionBuckets.cardId, cardId));
  const totals = rows[0];
  return {
    totalImpressions: Number(totals?.totalImpressions ?? 0),
    uniqueVisits: Number(totals?.uniqueVisits ?? 0),
  };
}
