export interface ThemeTokens {
  background: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
}

export type ThemeName =
  | 'github_light'
  | 'github_dark'
  | 'dracula'
  | 'nord'
  | 'solarized_light'
  | 'tokyo_night';

export const THEME_NAMES: readonly ThemeName[] = [
  'github_light',
  'github_dark',
  'dracula',
  'nord',
  'solarized_light',
  'tokyo_night',
] as const;

export const themes: Record<ThemeName, ThemeTokens> = {
  github_light: {
    background: '#ffffff',
    text: '#1f2328',
    muted: '#656d76',
    accent: '#0969da',
    border: '#d0d7de',
  },
  github_dark: {
    background: '#0d1117',
    text: '#e6edf3',
    muted: '#8b949e',
    accent: '#58a6ff',
    border: '#30363d',
  },
  dracula: {
    background: '#282a36',
    text: '#f8f8f2',
    muted: '#6272a4',
    accent: '#bd93f9',
    border: '#44475a',
  },
  nord: {
    background: '#2e3440',
    text: '#eceff4',
    muted: '#7a869a',
    accent: '#88c0d0',
    border: '#3b4252',
  },
  solarized_light: {
    background: '#fdf6e3',
    text: '#073642',
    muted: '#586e75',
    accent: '#268bd2',
    border: '#eee8d5',
  },
  tokyo_night: {
    background: '#1a1b26',
    text: '#c0caf5',
    muted: '#565f89',
    accent: '#7aa2f7',
    border: '#292e42',
  },
};

export function resolveTheme(name: ThemeName, overrides?: Partial<ThemeTokens>): ThemeTokens {
  return { ...themes[name], ...(overrides ?? {}) };
}
