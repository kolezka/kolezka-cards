import { escapeXml } from '../escape-xml';
import { type ThemeName, type ThemeTokens, resolveTheme } from '../themes';
import type { TopReposConfig } from '../zod/card-config';
import { languageColor } from './language-colors';

export interface TopRepoEntry {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  updatedAt: string | null;
}

export interface TopReposData {
  login: string;
  repos: TopRepoEntry[];
}

export interface RenderOptions {
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 240;

function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function renderTopRepos(
  config: TopReposConfig,
  data: TopReposData,
  opts: RenderOptions = {},
): string {
  const width = opts.width ?? DEFAULT_WIDTH;
  const height = opts.height ?? DEFAULT_HEIGHT;
  const tokens: ThemeTokens = resolveTheme(config.theme as ThemeName, config.overrides);
  const sortLabel =
    config.sort === 'stars'
      ? 'by stars'
      : config.sort === 'forks'
        ? 'by forks'
        : 'recently updated';
  const title = escapeXml(config.title ?? `${data.login} · top repos ${sortLabel}`);

  const top = data.repos.slice(0, config.limit);

  const padX = 24;
  const headerH = 52;
  const availH = height - headerH - 16;
  const rowH = top.length > 0 ? Math.max(34, Math.floor(availH / top.length)) : 0;
  const nameCharBudget = Math.max(14, Math.floor((width - padX * 2) / 9));

  const rows = top
    .map((r, i) => {
      const y = headerH + i * rowH;
      const langDot = r.language
        ? `<circle cx="${padX + 6}" cy="${y + 17}" r="5" fill="${languageColor(r.language)}"/>`
        : '';
      const langName = r.language
        ? `<text class="meta" x="${padX + 18}" y="${y + 20}">${escapeXml(r.language)}</text>`
        : '';
      const langSpan = r.language ? 18 + r.language.length * 7 + 12 : 0;

      const nameX = padX + langSpan;
      const name = escapeXml(truncate(r.name, nameCharBudget));
      const desc = r.description
        ? `<text class="desc" x="${padX}" y="${y + 36}">${escapeXml(truncate(r.description, nameCharBudget + 14))}</text>`
        : '';

      const starsX = width - padX;
      const forksX = starsX - 70;
      const stars = `<text class="meta" x="${starsX}" y="${y + 20}" text-anchor="end">★ ${compact(r.stars)}</text>`;
      const forks = `<text class="meta" x="${forksX}" y="${y + 20}" text-anchor="end">⑂ ${compact(r.forks)}</text>`;

      return `<g>
        ${langDot}
        ${langName}
        <text class="repo" x="${nameX}" y="${y + 20}">${name}</text>
        ${desc}
        ${forks}
        ${stars}
      </g>`;
    })
    .join('\n  ');

  const empty =
    top.length === 0
      ? `<text class="empty" x="${width / 2}" y="${height / 2 + 6}" text-anchor="middle">No public repos</text>`
      : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <defs>
    <style>
      .bg { fill: ${tokens.background}; }
      .border { fill: none; stroke: ${tokens.border}; stroke-width: 1; }
      .title { fill: ${tokens.text}; font: 600 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .repo { fill: ${tokens.accent}; font: 600 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .meta { fill: ${tokens.muted}; font: 500 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .desc { fill: ${tokens.muted}; font: 500 11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .empty { fill: ${tokens.muted}; font: 500 13px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    </style>
  </defs>
  <rect class="bg" x="0.5" y="0.5" rx="8" ry="8" width="${width - 1}" height="${height - 1}" />
  <rect class="border" x="0.5" y="0.5" rx="8" ry="8" width="${width - 1}" height="${height - 1}" />
  <text class="title" x="${padX}" y="32">${title}</text>
  ${rows}
  ${empty}
</svg>`;
}
