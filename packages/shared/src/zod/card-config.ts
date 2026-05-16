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
    height: z.number().int().min(80).max(600).optional(),
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

export const CardConfig = z.discriminatedUnion('type', [
  VisitCounterConfig,
  ProfileStatsConfig,
  RepoStatsConfig,
  StreakConfig,
  ProfileSummaryConfig,
]);

export type CardConfig = z.infer<typeof CardConfig>;
export type VisitCounterConfig = z.infer<typeof VisitCounterConfig>;
export type ProfileStatsConfig = z.infer<typeof ProfileStatsConfig>;
export type RepoStatsConfig = z.infer<typeof RepoStatsConfig>;
export type StreakConfig = z.infer<typeof StreakConfig>;
export type ProfileSummaryConfig = z.infer<typeof ProfileSummaryConfig>;
