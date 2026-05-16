import { type DB, schema } from '@kc/db';
import { and, eq, gte } from 'drizzle-orm';

function todayUtc(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Insert today's follower count for a user, idempotently.
 * Returns the row whether it was newly inserted or pre-existing.
 */
export function snapshotFollowers(
  db: DB,
  userId: string,
  followers: number,
  now: Date = new Date(),
): void {
  const day = todayUtc(now);
  // SQLite UPSERT — OR IGNORE makes the operation idempotent for the day.
  // We deliberately do NOT update an existing row so the snapshot reflects
  // the first value observed for the day (avoids jitter from rapid renders).
  db.insert(schema.usersFollowersHistory)
    .values({ userId, day, followers })
    .onConflictDoNothing()
    .run();
}

export interface FollowersHistoryRow {
  day: string;
  followers: number;
}

/**
 * Fetch follower history for a user, optionally from `sinceDay` onwards (inclusive),
 * sorted chronologically.
 */
export function getFollowersHistory(
  db: DB,
  userId: string,
  sinceDay?: string,
): FollowersHistoryRow[] {
  const rows = sinceDay
    ? db
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
        .all()
    : db
        .select({
          day: schema.usersFollowersHistory.day,
          followers: schema.usersFollowersHistory.followers,
        })
        .from(schema.usersFollowersHistory)
        .where(eq(schema.usersFollowersHistory.userId, userId))
        .all();
  rows.sort((a, b) => a.day.localeCompare(b.day));
  return rows;
}
