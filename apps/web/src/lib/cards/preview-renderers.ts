import { renderCustom } from '@kc/shared/svg/custom';
import { renderFollowersSparkline } from '@kc/shared/svg/followers-sparkline';
import { renderGistCounter } from '@kc/shared/svg/gist-counter';
import { renderLanguages } from '@kc/shared/svg/languages';
import { renderProfileStats } from '@kc/shared/svg/profile-stats';
import { renderProfileSummary } from '@kc/shared/svg/profile-summary';
import { renderProfileViews } from '@kc/shared/svg/profile-views';
import { renderRepoStats } from '@kc/shared/svg/repo-stats';
import { renderStreak } from '@kc/shared/svg/streak';
import { renderTopRepos } from '@kc/shared/svg/top-repos';
import { renderVisitCounter } from '@kc/shared/svg/visit-counter';
import { renderWakatime } from '@kc/shared/svg/wakatime';
import type {
  CustomConfig,
  FollowersSparklineConfig,
  GistCounterConfig,
  LanguagesConfig,
  ProfileStatsConfig,
  ProfileSummaryConfig,
  ProfileViewsConfig,
  RepoStatsConfig,
  StreakConfig,
  TopReposConfig,
  VisitCounterConfig,
  WakatimeConfig,
} from '@kc/shared/zod/card-config';
import {
  MOCK_CONTRIBUTIONS,
  MOCK_FOLLOWERS_HISTORY,
  MOCK_LANGUAGES,
  MOCK_TOP_REPOS,
  PREVIEW_CUSTOM_DATA,
  PREVIEW_LOGIN,
} from './preview-mock-data';

export type PreviewDims = { width?: number; height?: number };

/**
 * Render any card type client-side from the in-memory cfg with mock data.
 * Returns an empty string for unknown types or when the renderer throws on
 * an in-progress invalid cfg (caller keeps the last good preview in that
 * case).
 */
export function renderPreview(cardType: string, cfg: unknown, dims: PreviewDims): string {
  try {
    switch (cardType) {
      case 'custom':
        return renderCustom(cfg as CustomConfig, PREVIEW_CUSTOM_DATA, dims);
      case 'visit-counter':
        return renderVisitCounter(
          cfg as VisitCounterConfig,
          { totalImpressions: 1234, uniqueVisits: 567 },
          dims,
        );
      case 'profile-views':
        return renderProfileViews(cfg as ProfileViewsConfig, { views: 1842 }, dims);
      case 'profile-stats':
        return renderProfileStats(
          cfg as ProfileStatsConfig,
          {
            login: PREVIEW_LOGIN,
            publicRepos: 32,
            followers: 421,
            following: 87,
            topLanguages: MOCK_LANGUAGES.slice(0, 4),
          },
          dims,
        );
      case 'repo-stats': {
        const c = cfg as RepoStatsConfig;
        const [owner = PREVIEW_LOGIN, name = 'awesome-thing'] = (c.repo ?? '').split('/');
        return renderRepoStats(
          c,
          {
            owner,
            name,
            stars: 1240,
            forks: 89,
            primaryLanguage: 'TypeScript',
            languages: MOCK_LANGUAGES.slice(0, 4),
          },
          dims,
        );
      }
      case 'streak':
        return renderStreak(
          cfg as StreakConfig,
          {
            login: PREVIEW_LOGIN,
            totalThisYear: 1842,
            currentStreak: 17,
            longestStreak: 64,
            currentStreakStart: new Date(Date.now() - 16 * 86_400_000).toISOString().slice(0, 10),
            longestStreakStart: '2024-08-01',
            longestStreakEnd: '2024-10-03',
          },
          dims,
        );
      case 'profile-summary':
        return renderProfileSummary(
          cfg as ProfileSummaryConfig,
          {
            login: PREVIEW_LOGIN,
            publicRepos: 32,
            totalThisYear: 1842,
            joinedAt: '2014-04-01',
            contributions: MOCK_CONTRIBUTIONS,
          },
          dims,
        );
      case 'languages':
        return renderLanguages(
          cfg as LanguagesConfig,
          { login: PREVIEW_LOGIN, languages: MOCK_LANGUAGES },
          dims,
        );
      case 'top-repos':
        return renderTopRepos(
          cfg as TopReposConfig,
          { login: PREVIEW_LOGIN, repos: MOCK_TOP_REPOS },
          dims,
        );
      case 'followers-sparkline':
        return renderFollowersSparkline(
          cfg as FollowersSparklineConfig,
          {
            login: PREVIEW_LOGIN,
            currentFollowers: 421,
            history: MOCK_FOLLOWERS_HISTORY,
          },
          dims,
        );
      case 'wakatime':
        return renderWakatime(
          cfg as WakatimeConfig,
          {
            login: PREVIEW_LOGIN,
            totalSeconds: 3600 * 42,
            languages: [
              { name: 'TypeScript', seconds: 3600 * 21, percent: 50 },
              { name: 'Go', seconds: 3600 * 12, percent: 28.6 },
              { name: 'Rust', seconds: 3600 * 6, percent: 14.3 },
              { name: 'Python', seconds: 3600 * 3, percent: 7.1 },
            ],
          },
          dims,
        );
      case 'gist-counter':
        return renderGistCounter(
          cfg as GistCounterConfig,
          {
            login: PREVIEW_LOGIN,
            publicGists: 12,
            latestGist: {
              description: 'A quick snippet worth keeping.',
              updatedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
            },
          },
          dims,
        );
      default:
        return '';
    }
  } catch {
    return '';
  }
}
