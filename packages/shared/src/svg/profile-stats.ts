import { escapeXml } from '../escape-xml';
import { type ThemeName, type ThemeTokens, resolveTheme } from '../themes';
import type { ProfileStatsConfig } from '../zod/card-config';

export interface ProfileStatsData {
  login: string;
  publicRepos: number;
  followers: number;
  following: number;
  topLanguages: Array<{ name: string; bytes: number }>;
}

export interface RenderOptions {
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 200;

function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

function languageColor(name: string): string {
  // Tiny palette — extend in packages/themes later.
  const palette: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Svelte: '#ff3e00',
    Python: '#3572A5',
    Go: '#00ADD8',
    Rust: '#dea584',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Shell: '#89e051',
    Ruby: '#701516',
    Java: '#b07219',
    C: '#555555',
    'C++': '#f34b7d',
    Vue: '#41b883',
  };
  return palette[name] ?? '#8b949e';
}

export function renderProfileStats(
  config: ProfileStatsConfig,
  data: ProfileStatsData,
  opts: RenderOptions = {},
): string {
  const width = opts.width ?? DEFAULT_WIDTH;
  const height = opts.height ?? DEFAULT_HEIGHT;
  const tokens: ThemeTokens = resolveTheme(config.theme as ThemeName, config.overrides);
  const title = escapeXml(config.title ?? `${data.login}'s GitHub`);
  const showLangs = config.show.languages;

  const statsY = 64;
  const stats = [
    { label: 'Followers', value: compact(data.followers) },
    { label: 'Public repos', value: compact(data.publicRepos) },
    { label: 'Following', value: compact(data.following) },
  ];

  const totalBytes = data.topLanguages.reduce((sum, l) => sum + l.bytes, 0);
  const langs = showLangs && totalBytes > 0 ? data.topLanguages : [];

  const colWidth = (width - 48) / stats.length;
  const cells = stats
    .map((s, i) => {
      const x = 24 + i * colWidth;
      return `<g transform="translate(${x},0)">
    <text class="value" x="0" y="${statsY}">${escapeXml(s.value)}</text>
    <text class="label" x="0" y="${statsY + 22}">${escapeXml(s.label)}</text>
    <title>${escapeXml(s.label)}: ${escapeXml(s.value)}</title>
  </g>`;
    })
    .join('\n  ');

  let langSection = '';
  if (langs.length > 0) {
    const barY = height - 56;
    const barH = 12;
    const barX = 24;
    const barWidth = width - 48;
    let cursor = 0;
    const segments = langs
      .map((l) => {
        const w = Math.max(2, Math.round((l.bytes / totalBytes) * barWidth));
        const seg = `<rect x="${barX + cursor}" y="${barY}" width="${w}" height="${barH}" fill="${languageColor(l.name)}" rx="3" ry="3"><title>${escapeXml(l.name)}: ${Math.round((l.bytes / totalBytes) * 100)}%</title></rect>`;
        cursor += w;
        return seg;
      })
      .join('');
    const legend = langs
      .map((l, i) => {
        const lx = 24 + i * Math.floor((width - 48) / langs.length);
        return `<g transform="translate(${lx},${barY + barH + 18})"><rect width="8" height="8" fill="${languageColor(l.name)}" rx="2"/><text class="legend" x="14" y="8">${escapeXml(l.name)}</text></g>`;
      })
      .join('');
    langSection = `${segments}${legend}`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <defs>
    <style>
      .bg { fill: ${tokens.background}; }
      .border { fill: none; stroke: ${tokens.border}; stroke-width: 1; }
      .title { fill: ${tokens.text}; font: 600 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .label { fill: ${tokens.muted}; font: 500 11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .value { fill: ${tokens.accent}; font: 700 24px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .legend { fill: ${tokens.muted}; font: 500 10px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    </style>
  </defs>
  <rect class="bg" x="0.5" y="0.5" rx="8" ry="8" width="${width - 1}" height="${height - 1}" />
  <rect class="border" x="0.5" y="0.5" rx="8" ry="8" width="${width - 1}" height="${height - 1}" />
  <text class="title" x="24" y="32">${title}</text>
  ${cells}
  ${langSection}
</svg>`;
}
