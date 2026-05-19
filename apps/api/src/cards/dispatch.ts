import type { CardConfig } from '@kc/shared/zod/card-config';
import type { CardHandler } from './handler-types';
import { renderCustomHandler } from './handlers/custom';
import { renderFollowersSparklineHandler } from './handlers/followers-sparkline';
import { renderGistCounterHandler } from './handlers/gist-counter';
import { renderLanguagesHandler } from './handlers/languages';
import { renderProfileStatsHandler } from './handlers/profile-stats';
import { renderProfileSummaryHandler } from './handlers/profile-summary';
import { renderProfileViewsHandler } from './handlers/profile-views';
import { renderRepoStatsHandler } from './handlers/repo-stats';
import { renderStreakHandler } from './handlers/streak';
import { renderTopReposHandler } from './handlers/top-repos';
import { renderVisitCounterHandler } from './handlers/visit-counter';
import { renderWakatimeHandler } from './handlers/wakatime';

/**
 * Card-type → handler dispatch. Keys mirror the CardConfig discriminant; if
 * a new type is added to the zod schema, TypeScript will fail the Record
 * check until the matching handler is wired in here.
 */
export const HANDLERS: Record<CardConfig['type'], CardHandler> = {
  'visit-counter': renderVisitCounterHandler,
  'profile-views': renderProfileViewsHandler,
  'profile-stats': renderProfileStatsHandler,
  'repo-stats': renderRepoStatsHandler,
  streak: renderStreakHandler,
  'profile-summary': renderProfileSummaryHandler,
  languages: renderLanguagesHandler,
  'top-repos': renderTopReposHandler,
  'followers-sparkline': renderFollowersSparklineHandler,
  wakatime: renderWakatimeHandler,
  'gist-counter': renderGistCounterHandler,
  custom: renderCustomHandler,
};
