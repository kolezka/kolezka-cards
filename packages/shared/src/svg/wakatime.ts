import { escapeXml } from '../escape-xml';
import { type ThemeName, type ThemeTokens, resolveTheme } from '../themes';
import type { WakatimeConfig } from '../zod/card-config';
import { languageColor } from './language-colors';

export interface WakatimeLanguageEntry {
  name: string;
  seconds: number; // total seconds in the selected range
  percent: number; // 0..100, comes directly from Wakatime
}

export interface WakatimeData {
  login: string;
  totalSeconds: number;
  languages: WakatimeLanguageEntry[];
}

export interface RenderOptions {
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 240;

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  const minutes = totalSeconds / 60;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(hours < 10 ? 1 : 0)}h`.replace(/\.0h$/, 'h');
  const days = hours / 24;
  return `${days.toFixed(1).replace(/\.0$/, '')}d`;
}

function rangeLabel(range: WakatimeConfig['range']): string {
  switch (range) {
    case 'last_7_days':
      return 'last 7 days';
    case 'last_30_days':
      return 'last 30 days';
    case 'last_6_months':
      return 'last 6 months';
    case 'last_year':
      return 'last year';
  }
}

export function renderWakatime(
  config: WakatimeConfig,
  data: WakatimeData,
  opts: RenderOptions = {},
): string {
  const width = opts.width ?? DEFAULT_WIDTH;
  const height = opts.height ?? DEFAULT_HEIGHT;
  const tokens: ThemeTokens = resolveTheme(config.theme as ThemeName, config.overrides);
  const title = escapeXml(
    config.title ?? `${data.login} · coding time (${rangeLabel(config.range)})`,
  );
  const padX = 24;

  const langs = data.languages.slice(0, config.limit);
  const total = data.totalSeconds;
  const hasData = total > 0 && langs.length > 0;

  const bodyStartY = 56;

  let body = '';
  if (!hasData) {
    body = `<text class="empty" x="${width / 2}" y="${height / 2 + 6}" text-anchor="middle">No Wakatime activity</text>`;
  } else {
    const totalLabel = `<text class="value" x="${padX}" y="${bodyStartY + 16}">${escapeXml(formatDuration(total))}</text>
                       <text class="label" x="${padX}" y="${bodyStartY + 36}">${escapeXml(`coding time · ${rangeLabel(config.range)}`)}</text>`;

    const listStartY = bodyStartY + 56;
    const availH = height - listStartY - 16;
    const rowH = Math.max(20, Math.min(28, Math.floor(availH / langs.length)));
    const barX = padX + 96;
    const barW = width - barX - padX - 60;

    const rows = langs
      .map((l, i) => {
        const y = listStartY + i * rowH + Math.floor(rowH / 2);
        const segW = Math.max(2, Math.round((l.percent / 100) * barW));
        const dot = `<circle cx="${padX + 5}" cy="${y - 4}" r="5" fill="${languageColor(l.name)}"/>`;
        const name = `<text class="meta" x="${padX + 16}" y="${y}">${escapeXml(l.name)}</text>`;
        const bar = `<rect x="${barX}" y="${y - 8}" width="${barW}" height="6" rx="3" fill="${tokens.border}"/>
                     <rect x="${barX}" y="${y - 8}" width="${segW}" height="6" rx="3" fill="${languageColor(l.name)}"/>`;
        const pct = `<text class="meta" x="${width - padX}" y="${y}" text-anchor="end">${l.percent.toFixed(1)}%</text>`;
        return `${dot}${name}${bar}${pct}`;
      })
      .join('');
    body = `${totalLabel}${rows}`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <defs>
    <style>
      .bg { fill: ${tokens.background}; }
      .border { fill: none; stroke: ${tokens.border}; stroke-width: 1; }
      .title { fill: ${tokens.text}; font: 600 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .label { fill: ${tokens.muted}; font: 500 11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .value { fill: ${tokens.accent}; font: 700 22px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .meta { fill: ${tokens.text}; font: 500 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .empty { fill: ${tokens.muted}; font: 500 13px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    </style>
  </defs>
  <rect class="bg" x="0.5" y="0.5" rx="8" ry="8" width="${width - 1}" height="${height - 1}" />
  <rect class="border" x="0.5" y="0.5" rx="8" ry="8" width="${width - 1}" height="${height - 1}" />
  <text class="title" x="${padX}" y="32">${title}</text>
  ${body}
</svg>`;
}
