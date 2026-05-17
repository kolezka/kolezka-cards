import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  githubId: bigint('github_id', { mode: 'number' }).notNull().unique(),
  login: text('login').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .default(sql`now()`),
});

export const cards = pgTable(
  'cards',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    type: text('type').notNull(),
    configJson: jsonb('config_json').notNull(),
    theme: text('theme').notNull().default('github_dark'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    slugPerUser: uniqueIndex('cards_user_slug_uq').on(t.userId, t.slug),
  }),
);

export const visits = pgTable(
  'visits',
  {
    id: text('id').primaryKey(),
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    fingerprintHash: text('fingerprint_hash').notNull(),
    country: text('country'),
    referrerHost: text('referrer_host'),
    userAgentFamily: text('user_agent_family'),
    viaCamo: boolean('via_camo').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    cardFpIdx: index('visits_card_fp_created_idx').on(t.cardId, t.fingerprintHash, t.createdAt),
  }),
);

export const impressionBuckets = pgTable(
  'impression_buckets',
  {
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    hourBucket: integer('hour_bucket').notNull(),
    totalImpressions: integer('total_impressions').notNull().default(0),
    uniqueVisits: integer('unique_visits').notNull().default(0),
    // Source split. Sum of direct+camo equals totalImpressions for buckets
    // created after migration 0003 (SQLite era); older buckets had both at 0
    // and the dashboard surfaces the split as "unknown" for them. After the
    // PG cutover, all rows are post-split by construction.
    directImpressions: integer('direct_impressions').notNull().default(0),
    camoImpressions: integer('camo_impressions').notNull().default(0),
  },
  (t) => ({
    pk: uniqueIndex('impression_buckets_pk').on(t.cardId, t.hourBucket),
  }),
);

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    userAgentHash: text('user_agent_hash'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    userIdx: index('sessions_user_idx').on(t.userId),
    expiresIdx: index('sessions_expires_idx').on(t.expiresAt),
  }),
);

export const oauthState = pgTable(
  'oauth_state',
  {
    state: text('state').primaryKey(),
    codeVerifier: text('code_verifier'),
    redirectTo: text('redirect_to'),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    expiresIdx: index('oauth_state_expires_idx').on(t.expiresAt),
  }),
);

// Daily snapshots of follower counts per user. Populated lazily on render
// of a followers-sparkline card; one row per (userId, day) — idempotent.
export const usersFollowersHistory = pgTable(
  'users_followers_history',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    day: date('day', { mode: 'string' }).notNull(), // ISO date YYYY-MM-DD in UTC
    followers: integer('followers').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => ({
    pk: uniqueIndex('users_followers_history_pk').on(t.userId, t.day),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;
export type ImpressionBucket = typeof impressionBuckets.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type OAuthState = typeof oauthState.$inferSelect;
export type NewOAuthState = typeof oauthState.$inferInsert;
export type UsersFollowersHistory = typeof usersFollowersHistory.$inferSelect;
export type NewUsersFollowersHistory = typeof usersFollowersHistory.$inferInsert;
