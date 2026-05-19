import type { CustomData } from '@kc/shared/svg/custom';

// Deterministic mock data for the in-edit live preview. Constant patterns
// (Math.sin / Math.cos) so re-deriving the preview on every keystroke
// doesn't reshuffle the contribution chart or follower sparkline — the
// canvas would shake otherwise.

export const PREVIEW_LOGIN = 'octocat';

export const MOCK_LANGUAGES = [
  { name: 'TypeScript', bytes: 320_000 },
  { name: 'JavaScript', bytes: 180_000 },
  { name: 'Go', bytes: 95_000 },
  { name: 'Rust', bytes: 42_000 },
  { name: 'Python', bytes: 28_000 },
];

export const MOCK_FOLLOWERS_HISTORY = Array.from({ length: 365 }, (_, i) => {
  const day = new Date(Date.now() - (364 - i) * 86_400_000).toISOString().slice(0, 10);
  return { day, followers: 380 + Math.round(Math.sin(i / 12) * 18 + i * 0.12) };
});

export const MOCK_CONTRIBUTIONS = Array.from({ length: 365 }, (_, i) => {
  const date = new Date(Date.now() - (364 - i) * 86_400_000).toISOString().slice(0, 10);
  const pseudo = (Math.sin(i * 1.7) + Math.cos(i * 0.31)) * 2.5;
  return { date, count: Math.max(0, Math.round(4 + Math.sin(i / 5) * 4 + pseudo)) };
});

export const MOCK_TOP_REPOS = [
  {
    name: 'awesome-thing',
    description: 'A delightful library that does the thing.',
    language: 'TypeScript',
    stars: 1240,
    forks: 89,
    updatedAt: new Date().toISOString(),
  },
  {
    name: 'utility-belt',
    description: 'Small reusable helpers, well documented.',
    language: 'Go',
    stars: 320,
    forks: 22,
    updatedAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
  },
  {
    name: 'side-project',
    description: null,
    language: 'Rust',
    stars: 87,
    forks: 4,
    updatedAt: new Date(Date.now() - 12 * 86_400_000).toISOString(),
  },
  {
    name: 'docs',
    description: 'Handbook and architecture notes.',
    language: 'Markdown',
    stars: 41,
    forks: 7,
    updatedAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
  },
];

export const PREVIEW_CUSTOM_DATA: CustomData = {
  visits: { total: 1234, unique: 567 },
  github: {
    stars: 1687,
    followers: 421,
    repos: 32,
    gists: 5,
    contributionsYear: 1842,
    topLanguage: 'TypeScript',
  },
  followersHistory: MOCK_FOLLOWERS_HISTORY,
  contributionsHistory: MOCK_CONTRIBUTIONS,
  currentFollowers: 421,
};
