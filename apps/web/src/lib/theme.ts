export const THEME_NAMES = [
  'github_light',
  'github_dark',
  'dracula',
  'nord',
  'solarized_light',
  'tokyo_night',
] as const;

export type ThemeName = (typeof THEME_NAMES)[number];

export const CARD_TYPES = [
  'visit-counter',
  'profile-stats',
  'repo-stats',
  'streak',
  'profile-summary',
  'languages',
  'top-repos',
  'gist-counter',
  'wakatime',
  'followers-sparkline',
] as const;
export type CardType = (typeof CARD_TYPES)[number];

export function defaultConfigFor(type: CardType, theme: ThemeName = 'github_dark') {
  switch (type) {
    case 'visit-counter':
      return { type, theme, title: 'Visits', show: { total: true, unique: true } };
    case 'profile-stats':
      return { type, theme, show: { languages: true, commitGraph: false } };
    case 'repo-stats':
      return { type, theme, repo: 'octocat/Hello-World' };
    case 'streak':
      return { type, theme };
    case 'profile-summary':
      return {
        type,
        theme,
        period: '1y',
        show: { contributions: true, repos: true, joined: true, chart: true },
      };
    case 'languages':
      return { type, theme, limit: 8, style: 'bar' };
    case 'top-repos':
      return { type, theme, limit: 5, sort: 'stars' };
    case 'gist-counter':
      return { type, theme, show: { count: true, latest: true } };
    case 'wakatime':
      return { type, theme, apiKey: '', range: 'last_7_days', limit: 6 };
    case 'followers-sparkline':
      return { type, theme, period: '90d' };
  }
}
