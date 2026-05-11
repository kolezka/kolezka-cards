import { escapeXml } from '../escape-xml';
import { type ThemeName, type ThemeTokens, resolveTheme } from '../themes';
import type { VisitCounterConfig } from '../zod/card-config';

export interface VisitCounterData {
  totalImpressions: number;
  uniqueVisits: number;
}

export interface RenderOptions {
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 160;

function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

export function renderVisitCounter(
  config: VisitCounterConfig,
  data: VisitCounterData,
  opts: RenderOptions = {},
): string {
  const width = opts.width ?? DEFAULT_WIDTH;
  const height = opts.height ?? DEFAULT_HEIGHT;
  const tokens: ThemeTokens = resolveTheme(config.theme as ThemeName, config.overrides);
  const title = escapeXml(config.title ?? 'Visits');
  const showTotal = config.show.total;
  const showUnique = config.show.unique;
  const columns = (showTotal ? 1 : 0) + (showUnique ? 1 : 0);
  const colWidth = columns > 0 ? (width - 48) / columns : width - 48;

  const cells: string[] = [];
  let xCursor = 24;
  if (showTotal) {
    cells.push(
      cell(
        xCursor,
        height,
        colWidth,
        'Total impressions',
        formatCount(data.totalImpressions),
        tokens,
      ),
    );
    xCursor += colWidth;
  }
  if (showUnique) {
    cells.push(
      cell(xCursor, height, colWidth, 'Unique visits', formatCount(data.uniqueVisits), tokens),
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <defs>
    <style>
      .bg { fill: ${tokens.background}; }
      .border { fill: none; stroke: ${tokens.border}; stroke-width: 1; }
      .title { fill: ${tokens.text}; font: 600 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .label { fill: ${tokens.muted}; font: 500 11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .value { fill: ${tokens.accent}; font: 700 28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    </style>
  </defs>
  <rect class="bg" x="0.5" y="0.5" rx="8" ry="8" width="${width - 1}" height="${height - 1}" />
  <rect class="border" x="0.5" y="0.5" rx="8" ry="8" width="${width - 1}" height="${height - 1}" />
  <text class="title" x="24" y="32">${title}</text>
  ${cells.join('\n  ')}
</svg>`;
}

function cell(
  x: number,
  height: number,
  width: number,
  label: string,
  value: string,
  _tokens: ThemeTokens,
): string {
  const cy = Math.round(height * 0.62);
  const ly = cy + 22;
  return `<g transform="translate(${x},0)">
    <text class="value" x="0" y="${cy}">${escapeXml(value)}</text>
    <text class="label" x="0" y="${ly}">${escapeXml(label)}</text>
    <title>${escapeXml(label)}: ${escapeXml(value)}</title>
    <rect x="0" y="0" width="${width}" height="${height}" fill="transparent" />
  </g>`;
}
