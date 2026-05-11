import { escapeXml } from '../escape-xml';
import { type ThemeName, type ThemeTokens, resolveTheme } from '../themes';
import type { StreakConfig } from '../zod/card-config';

export interface StreakData {
  login: string;
  totalThisYear: number;
  currentStreak: number;
  longestStreak: number;
  currentStreakStart: string | null;
  longestStreakStart: string | null;
  longestStreakEnd: string | null;
}

export interface RenderOptions {
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 180;

function fmtRange(start: string | null, end: string | null): string {
  if (!start) return '—';
  if (!end || start === end) return start;
  return `${start} → ${end}`;
}

export function renderStreak(
  config: StreakConfig,
  data: StreakData,
  opts: RenderOptions = {},
): string {
  const width = opts.width ?? DEFAULT_WIDTH;
  const height = opts.height ?? DEFAULT_HEIGHT;
  const tokens: ThemeTokens = resolveTheme(config.theme as ThemeName, config.overrides);
  const title = escapeXml(config.title ?? `${data.login}'s contribution streak`);
  const year = new Date().getUTCFullYear();

  const stats = [
    {
      label: `Contributions ${year}`,
      value: String(data.totalThisYear),
      sub: '',
    },
    {
      label: 'Current streak',
      value: `${data.currentStreak}`,
      sub: data.currentStreakStart ? `since ${escapeXml(data.currentStreakStart)}` : '—',
    },
    {
      label: 'Longest streak',
      value: `${data.longestStreak}`,
      sub: escapeXml(fmtRange(data.longestStreakStart, data.longestStreakEnd)),
    },
  ];

  const colWidth = (width - 48) / stats.length;
  const cells = stats
    .map((s, i) => {
      const x = 24 + i * colWidth;
      return `<g transform="translate(${x},0)">
    <text class="value" x="0" y="80">${escapeXml(s.value)}</text>
    <text class="label" x="0" y="102">${escapeXml(s.label)}</text>
    <text class="sub" x="0" y="120">${s.sub}</text>
  </g>`;
    })
    .join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <defs>
    <style>
      .bg { fill: ${tokens.background}; }
      .border { fill: none; stroke: ${tokens.border}; stroke-width: 1; }
      .title { fill: ${tokens.text}; font: 600 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .label { fill: ${tokens.muted}; font: 500 11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .value { fill: ${tokens.accent}; font: 700 28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .sub { fill: ${tokens.muted}; font: 500 10px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    </style>
  </defs>
  <rect class="bg" x="0.5" y="0.5" rx="8" ry="8" width="${width - 1}" height="${height - 1}" />
  <rect class="border" x="0.5" y="0.5" rx="8" ry="8" width="${width - 1}" height="${height - 1}" />
  <text class="title" x="24" y="32">${title}</text>
  ${cells}
</svg>`;
}
