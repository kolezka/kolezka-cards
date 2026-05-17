import { type DB, schema } from '@kc/db';
import { and, eq, gte } from 'drizzle-orm';

function todayUtc(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Insert today's follower count for a user, idempotently.
 * Returns the row whether it was newly inserted or pre-existing.
 */
export async function snapshotFollowers(
  db: DB,
  userId: string,
  followers: number,
  now: Date = new Date(),
): Promise<void> {
  const day = todayUtc(now);
  // Idempotent insert: ON CONFLICT DO NOTHING. We deliberately do NOT
  // update an existing row so the snapshot reflects the first value
  // observed for the day (avoids jitter from rapid renders).
  await db
    .insert(schema.usersFollowersHistory)
    .values({ userId, day, followers })
    .onConflictDoNothing();
}

export interface FollowersHistoryRow {
  day: string;
  followers: number;
}

/**
 * Fetch follower history for a user, optionally from `sinceDay` onwards (inclusive),
 * sorted chronologically.
 */
export async function getFollowersHistory(
  db: DB,
  userId: string,
  sinceDay?: string,
): Promise<FollowersHistoryRow[]> {
  const rows = sinceDay
    ? await db
        .select({
          day: schema.usersFollowersHistory.day,
          followers: schema.usersFollowersHistory.followers,
        })
        .from(schema.usersFollowersHistory)
        .where(
          and(
            eq(schema.usersFollowersHistory.userId, userId),
            gte(schema.usersFollowersHistory.day, sinceDay),
          ),
        )
    : await db
        .select({
          day: schema.usersFollowersHistory.day,
          followers: schema.usersFollowersHistory.followers,
        })
        .from(schema.usersFollowersHistory)
        .where(eq(schema.usersFollowersHistory.userId, userId));
  rows.sort((a, b) => a.day.localeCompare(b.day));
  return rows;
}
