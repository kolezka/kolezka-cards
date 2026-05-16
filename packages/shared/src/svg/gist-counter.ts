import { escapeXml } from '../escape-xml';
import { type ThemeName, type ThemeTokens, resolveTheme } from '../themes';
import type { GistCounterConfig } from '../zod/card-config';

export interface GistCounterData {
  login: string;
  publicGists: number;
  latestGist: { description: string | null; updatedAt: string | null } | null;
}

export interface RenderOptions {
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 160;

function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function relativeAge(updatedAt: string | null, now: Date): string {
  if (!updatedAt) return '';
  const t = Date.parse(updatedAt);
  if (Number.isNaN(t)) return '';
  const diffSec = Math.max(0, (now.getTime() - t) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86_400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 30 * 86_400) return `${Math.floor(diffSec / 86_400)}d ago`;
  if (diffSec < 365 * 86_400) return `${Math.floor(diffSec / (30 * 86_400))}mo ago`;
  return `${Math.floor(diffSec / (365 * 86_400))}y ago`;
}

export function renderGistCounter(
  config: GistCounterConfig,
  data: GistCounterData,
  opts: RenderOptions = {},
): string {
  const width = opts.width ?? DEFAULT_WIDTH;
  const height = opts.height ?? DEFAULT_HEIGHT;
  const tokens: ThemeTokens = resolveTheme(config.theme as ThemeName, config.overrides);
  const title = escapeXml(config.title ?? `${data.login}'s gists`);
  const now = new Date();
  const showCount = config.show.count;
  const showLatest = config.show.latest && data.latestGist !== null;

  const charBudget = Math.max(16, Math.floor((width - 48) / 8));

  // Layout:
  // [ Big count ]  [ Latest gist title (smaller) ]
  // [ "Public gists" label ]  [ "<n>d ago" muted ]
  const valueX = 24;
  const valueY = Math.round(height * 0.62);
  const labelY = valueY + 22;

  const left = showCount
    ? `<text class="value" x="${valueX}" y="${valueY}">${escapeXml(compact(data.publicGists))}</text>
       <text class="label" x="${valueX}" y="${labelY}">Public gists</text>`
    : '';

  let right = '';
  if (showLatest && data.latestGist) {
    const rx = showCount ? Math.round(width * 0.42) : valueX;
    const desc = data.latestGist.description
      ? truncate(data.latestGist.description, charBudget - (showCount ? 8 : 0))
      : 'Untitled gist';
    const age = relativeAge(data.latestGist.updatedAt, now);
    right = `<text class="muted-sm" x="${rx}" y="32">Latest</text>
             <text class="repo" x="${rx}" y="${valueY - 8}">${escapeXml(desc)}</text>
             ${age ? `<text class="label" x="${rx}" y="${labelY}">${escapeXml(age)}</text>` : ''}`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <defs>
    <style>
      .bg { fill: ${tokens.background}; }
      .border { fill: none; stroke: ${tokens.border}; stroke-width: 1; }
      .title { fill: ${tokens.text}; font: 600 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .label { fill: ${tokens.muted}; font: 500 11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .value { fill: ${tokens.accent}; font: 700 28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .repo { fill: ${tokens.text}; font: 600 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .muted-sm { fill: ${tokens.muted}; font: 500 11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    </style>
  </defs>
  <rect class="bg" x="0.5" y="0.5" rx="8" ry="8" width="${width - 1}" height="${height - 1}" />
  <rect class="border" x="0.5" y="0.5" rx="8" ry="8" width="${width - 1}" height="${height - 1}" />
  <text class="title" x="24" y="32">${title}</text>
  ${left}
  ${right}
</svg>`;
}
