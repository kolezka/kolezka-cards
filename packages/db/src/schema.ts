import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  githubId: integer('github_id').notNull().unique(),
  login: text('login').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const cards = sqliteTable(
  'cards',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    type: text('type').notNull(),
    configJson: text('config_json', { mode: 'json' }).notNull(),
    theme: text('theme').notNull().default('github_dark'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    slugPerUser: uniqueIndex('cards_user_slug_uq').on(t.userId, t.slug),
  }),
);

export const visits = sqliteTable(
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
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    cardFpIdx: index('visits_card_fp_created_idx').on(t.cardId, t.fingerprintHash, t.createdAt),
  }),
);

export const impressionBuckets = sqliteTable(
  'impression_buckets',
  {
    cardId: text('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    hourBucket: integer('hour_bucket').notNull(),
    totalImpressions: integer('total_impressions').notNull().default(0),
    uniqueVisits: integer('unique_visits').notNull().default(0),
  },
  (t) => ({
    pk: uniqueIndex('impression_buckets_pk').on(t.cardId, t.hourBucket),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;
export type ImpressionBucket = typeof impressionBuckets.$inferSelect;
