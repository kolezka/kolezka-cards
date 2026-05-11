export const THEME_NAMES = [
  'github_light',
  'github_dark',
  'dracula',
  'nord',
  'solarized_light',
  'tokyo_night',
] as const;

export type ThemeName = (typeof THEME_NAMES)[number];

export const CARD_TYPES = ['visit-counter', 'profile-stats', 'repo-stats', 'streak'] as const;
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
  }
}
