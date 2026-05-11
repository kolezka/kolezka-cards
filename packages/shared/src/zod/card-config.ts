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

const CardBase = z.object({
  theme: ThemeName.default('github_dark'),
  title: z.string().max(80).optional(),
  overrides: ThemeOverrides.optional(),
});

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

export const CardConfig = z.discriminatedUnion('type', [
  VisitCounterConfig,
  ProfileStatsConfig,
  RepoStatsConfig,
  StreakConfig,
]);

export type CardConfig = z.infer<typeof CardConfig>;
export type VisitCounterConfig = z.infer<typeof VisitCounterConfig>;
export type ProfileStatsConfig = z.infer<typeof ProfileStatsConfig>;
export type RepoStatsConfig = z.infer<typeof RepoStatsConfig>;
export type StreakConfig = z.infer<typeof StreakConfig>;
