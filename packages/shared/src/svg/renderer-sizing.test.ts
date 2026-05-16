import { describe, expect, it } from 'bun:test';
import {
  ProfileStatsConfig,
  ProfileSummaryConfig,
  RepoStatsConfig,
  StreakConfig,
  VisitCounterConfig,
} from '../zod/card-config';
import { renderProfileStats } from './profile-stats';
import { renderProfileSummary } from './profile-summary';
import { renderRepoStats } from './repo-stats';
import { renderStreak } from './streak';
import { renderVisitCounter } from './visit-counter';

const visitCfg = VisitCounterConfig.parse({ type: 'visit-counter' });
const profileStatsCfg = ProfileStatsConfig.parse({ type: 'profile-stats' });
const repoCfg = RepoStatsConfig.parse({ type: 'repo-stats', repo: 'octocat/Hello-World' });
const streakCfg = StreakConfig.parse({ type: 'streak' });
const summaryCfg = ProfileSummaryConfig.parse({ type: 'profile-summary' });

const visitData = { totalImpressions: 100, uniqueVisits: 50 };
const profileStatsData = {
  login: 'octocat',
  publicRepos: 5,
  followers: 10,
  following: 3,
  topLanguages: [{ name: 'TypeScript', bytes: 1000 }],
};
const repoData = {
  owner: 'octocat',
  name: 'Hello-World',
  stars: 100,
  forks: 20,
  primaryLanguage: 'TypeScript',
  languages: [{ name: 'TypeScript', bytes: 1000 }],
};
const streakData = {
  login: 'octocat',
  currentStreak: 5,
  longestStreak: 30,
  totalThisYear: 250,
  currentStreakStart: '2026-05-10',
  longestStreakStart: '2025-12-01',
  longestStreakEnd: '2025-12-30',
};
const summaryData = {
  login: 'octocat',
  publicRepos: 5,
  totalThisYear: 250,
  joinedAt: '2020-01-01T00:00:00Z',
  contributions: [{ date: '2026-05-15', count: 3 }],
};

const tableTests = [
  {
    name: 'visit-counter',
    render: () => renderVisitCounter(visitCfg, visitData, { width: 320, height: 100 }),
  },
  {
    name: 'profile-stats',
    render: () =>
      renderProfileStats(profileStatsCfg, profileStatsData, { width: 320, height: 100 }),
  },
  {
    name: 'repo-stats',
    render: () => renderRepoStats(repoCfg, repoData, { width: 320, height: 100 }),
  },
  {
    name: 'streak',
    render: () => renderStreak(streakCfg, streakData, { width: 320, height: 100 }),
  },
  {
    name: 'profile-summary',
    render: () => renderProfileSummary(summaryCfg, summaryData, { width: 800, height: 240 }),
  },
];

describe('renderers respect custom width/height', () => {
  for (const t of tableTests) {
    it(`${t.name} emits SVG with the requested dims`, () => {
      const svg = t.render();
      const expected = t.name === 'profile-summary' ? { w: 800, h: 240 } : { w: 320, h: 100 };
      expect(svg).toContain(`width="${expected.w}"`);
      expect(svg).toContain(`height="${expected.h}"`);
      expect(svg).toContain(`viewBox="0 0 ${expected.w} ${expected.h}"`);
    });
  }

  it('falls back to defaults when no size given', () => {
    const svg = renderVisitCounter(visitCfg, visitData);
    expect(svg).toContain('width="480"');
    expect(svg).toContain('height="160"');
  });
});
