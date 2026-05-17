import { z } from 'zod';
import { THEME_NAMES } from '../themes';

const HexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/, 'expected hex color like #fff or #ff00aa');

const ThemeName = z.enum(THEME_NAMES as unknown as [string, ...string[]]);

const ThemeOverrides = z
  .object({
    background: HexColor.optional(),
    text: HexColor.optional(),
    muted: HexColor.optional(),
    accent: HexColor.optional(),
    border: HexColor.optional(),
  })
  .strict();

const CardSize = z
  .object({
    width: z.number().int().min(200).max(1200).optional(),
    height: z.number().int().min(32).max(600).optional(),
  })
  .strict();

const CardBase = z.object({
  theme: ThemeName.default('github_dark'),
  title: z.string().max(80).optional(),
  overrides: ThemeOverrides.optional(),
  size: CardSize.optional(),
});

export type CardSize = z.infer<typeof CardSize>;

export const VisitCounterConfig = CardBase.extend({
  type: z.literal('visit-counter'),
  show: z
    .object({
      total: z.boolean().default(true),
      unique: z.boolean().default(true),
    })
    .default({ total: true, unique: true }),
});

/**
 * Compact badge-style card that shows a single profile-view count.
 * Same impression-bucket data as visit-counter, just one number rendered
 * in a small (~220x40) shield-style SVG suitable for a README header.
 */
export const ProfileViewsConfig = CardBase.extend({
  type: z.literal('profile-views'),
  metric: z.enum(['total', 'unique']).default('total'),
});

export const ProfileStatsConfig = CardBase.extend({
  type: z.literal('profile-stats'),
  show: z
    .object({
      languages: z.boolean().default(true),
      commitGraph: z.boolean().default(false),
    })
    .default({ languages: true, commitGraph: false }),
});

export const RepoStatsConfig = CardBase.extend({
  type: z.literal('repo-stats'),
  repo: z.string().regex(/^[^/]+\/[^/]+$/, 'expected owner/repo'),
});

export const StreakConfig = CardBase.extend({
  type: z.literal('streak'),
});

export const TimePeriod = z.union([
  z.enum(['1m', '3m', '6m', '1y', '2y', 'all']),
  z.object({ days: z.number().int().min(7).max(1825) }).strict(),
]);
export type TimePeriod = z.infer<typeof TimePeriod>;

export const ProfileSummaryConfig = CardBase.extend({
  type: z.literal('profile-summary'),
  period: TimePeriod.default('1y'),
  show: z
    .object({
      contributions: z.boolean().default(true),
      repos: z.boolean().default(true),
      joined: z.boolean().default(true),
      chart: z.boolean().default(true),
    })
    .default({ contributions: true, repos: true, joined: true, chart: true }),
});

export const LanguagesConfig = CardBase.extend({
  type: z.literal('languages'),
  limit: z.number().int().min(3).max(15).default(8),
  style: z.enum(['bar', 'donut']).default('bar'),
});

export const TopReposConfig = CardBase.extend({
  type: z.literal('top-repos'),
  limit: z.number().int().min(3).max(8).default(5),
  sort: z.enum(['stars', 'forks', 'updated']).default('stars'),
});

export const GistCounterConfig = CardBase.extend({
  type: z.literal('gist-counter'),
  show: z
    .object({
      count: z.boolean().default(true),
      latest: z.boolean().default(true),
    })
    .default({ count: true, latest: true }),
});

export const FollowersSparklineConfig = CardBase.extend({
  type: z.literal('followers-sparkline'),
  period: z.enum(['30d', '90d', '365d', 'all']).default('90d'),
});

// Wakatime API key is currently stored as plain text in config_json.
// TODO: encrypt at rest using APP_SECRET-derived key (AES-256-GCM).
// Acceptable for v1 in a self-hosted single-tenant deployment; not for
// multi-tenant SaaS.
//
// apiKey is allowed to be empty at the schema level so cards can be created
// before the user has obtained a Wakatime token. The endpoint treats an
// empty/short value as "not configured" and renders the empty state instead
// of calling the Wakatime API.
export const WakatimeConfig = CardBase.extend({
  type: z.literal('wakatime'),
  apiKey: z.string().max(200).default(''),
  range: z
    .enum(['last_7_days', 'last_30_days', 'last_6_months', 'last_year'])
    .default('last_7_days'),
  limit: z.number().int().min(3).max(10).default(6),
});

export const CardConfig = z.discriminatedUnion('type', [
  VisitCounterConfig,
  ProfileStatsConfig,
  RepoStatsConfig,
  StreakConfig,
  ProfileSummaryConfig,
  LanguagesConfig,
  TopReposConfig,
  GistCounterConfig,
  WakatimeConfig,
  FollowersSparklineConfig,
  ProfileViewsConfig,
]);

export type CardConfig = z.infer<typeof CardConfig>;
export type VisitCounterConfig = z.infer<typeof VisitCounterConfig>;
export type ProfileStatsConfig = z.infer<typeof ProfileStatsConfig>;
export type RepoStatsConfig = z.infer<typeof RepoStatsConfig>;
export type StreakConfig = z.infer<typeof StreakConfig>;
export type ProfileSummaryConfig = z.infer<typeof ProfileSummaryConfig>;
export type LanguagesConfig = z.infer<typeof LanguagesConfig>;
export type TopReposConfig = z.infer<typeof TopReposConfig>;
export type GistCounterConfig = z.infer<typeof GistCounterConfig>;
export type WakatimeConfig = z.infer<typeof WakatimeConfig>;
export type FollowersSparklineConfig = z.infer<typeof FollowersSparklineConfig>;
export type ProfileViewsConfig = z.infer<typeof ProfileViewsConfig>;
