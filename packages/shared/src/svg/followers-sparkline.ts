import { escapeXml } from '../escape-xml';
import { type ThemeName, type ThemeTokens, resolveTheme } from '../themes';
import type { FollowersSparklineConfig } from '../zod/card-config';

export interface FollowersPoint {
  day: string; // ISO YYYY-MM-DD
  followers: number;
}

export interface FollowersSparklineData {
  login: string;
  history: FollowersPoint[]; // chronological
  currentFollowers: number;
}

export interface RenderOptions {
  width?: number;
  height?: number;
  now?: Date;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 180;
const MS_PER_DAY = 86_400_000;

export function daysForPeriod(period: FollowersSparklineConfig['period']): number {
  switch (period) {
    case '30d':
      return 30;
    case '90d':
      return 90;
    case '365d':
      return 365;
    case 'all':
      return 36_500;
  }
}

function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

function buildPath(
  pts: FollowersPoint[],
  geom: { x: number; y: number; w: number; h: number },
  minMs: number,
  maxMs: number,
  minY: number,
  maxY: number,
): { line: string; area: string } {
  if (pts.length === 0 || maxMs <= minMs) return { line: '', area: '' };
  const ySpan = maxY - minY || 1;
  const xSpan = maxMs - minMs;

  const coords = pts.map((p) => {
    const t = new Date(`${p.day}T00:00:00Z`).getTime();
    const px = geom.x + ((t - minMs) / xSpan) * geom.w;
    const py = geom.y + geom.h - ((p.followers - minY) / ySpan) * geom.h;
    return [px, py] as const;
  });

  if (coords.length === 1) {
    const [x, y] = coords[0]!;
    const line = `M ${x.toFixed(2)} ${y.toFixed(2)} L ${(x + 0.1).toFixed(2)} ${y.toFixed(2)}`;
    return { line, area: '' };
  }

  const linePts = coords.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L ');
  const line = `M ${linePts}`;
  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  const baseY = geom.y + geom.h;
  const area = `M ${first[0].toFixed(2)},${baseY.toFixed(2)} L ${linePts} L ${last[0].toFixed(2)},${baseY.toFixed(2)} Z`;
  return { line, area };
}

function periodLabel(period: FollowersSparklineConfig['period']): string {
  switch (period) {
    case '30d':
      return 'last 30 days';
    case '90d':
      return 'last 90 days';
    case '365d':
      return 'last year';
    case 'all':
      return 'all time';
  }
}

export function renderFollowersSparkline(
  config: FollowersSparklineConfig,
  data: FollowersSparklineData,
  opts: RenderOptions = {},
): string {
  const width = opts.width ?? DEFAULT_WIDTH;
  const height = opts.height ?? DEFAULT_HEIGHT;
  const tokens: ThemeTokens = resolveTheme(config.theme as ThemeName, config.overrides);
  const now = opts.now ?? new Date();
  const title = escapeXml(config.title ?? `${data.login} · followers`);

  const days = daysForPeriod(config.period);
  const endMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startMs = config.period === 'all' ? 0 : endMs - days * MS_PER_DAY;

  const inRange = data.history.filter((p) => {
    const t = new Date(`${p.day}T00:00:00Z`).getTime();
    if (Number.isNaN(t)) return false;
    if (config.period !== 'all' && t < startMs) return false;
    return t <= endMs;
  });

  const padX = 24;
  const padTop = 56;
  const padBot = 28;
  const geom = {
    x: padX,
    y: padTop,
    w: width - padX * 2,
    h: height - padTop - padBot,
  };

  // Compute Y bounds with a small margin
  const ys = inRange.map((p) => p.followers);
  const rawMin = ys.length > 0 ? Math.min(...ys) : 0;
  const rawMax = ys.length > 0 ? Math.max(...ys) : 0;
  const yPad = Math.max(1, Math.round((rawMax - rawMin) * 0.1));
  const minY = Math.max(0, rawMin - yPad);
  const maxY = rawMax + yPad;

  // Effective time range: tighten to data bounds for 'all', else use the period window
  let timeMin = startMs;
  let timeMax = endMs;
  if (config.period === 'all' && inRange.length > 0) {
    const firstT = new Date(`${inRange[0]!.day}T00:00:00Z`).getTime();
    const lastT = new Date(`${inRange[inRange.length - 1]!.day}T00:00:00Z`).getTime();
    timeMin = firstT;
    timeMax = Math.max(lastT, firstT + MS_PER_DAY);
  }

  const { line, area } = buildPath(inRange, geom, timeMin, timeMax, minY, maxY);

  // Headline = current followers, with delta vs first in-range point
  const headValue = compact(data.currentFollowers);
  const baseFollowers = inRange[0]?.followers ?? data.currentFollowers;
  const delta = data.currentFollowers - baseFollowers;
  const deltaLabel =
    inRange.length > 1
      ? `${delta >= 0 ? '+' : ''}${compact(Math.abs(delta))} ${deltaSign(delta)}`
      : '';

  const headline = `<text class="value" x="${padX}" y="44">${escapeXml(headValue)}</text>
                    <text class="label" x="${padX + 8 + headValue.length * 14}" y="44">${escapeXml(periodLabel(config.period))}</text>
                    ${deltaLabel ? `<text class="delta ${delta >= 0 ? 'up' : 'down'}" x="${width - padX}" y="44" text-anchor="end">${escapeXml(deltaLabel)}</text>` : ''}`;

  const baseLine = `<line class="baseline" x1="${geom.x}" x2="${geom.x + geom.w}" y1="${geom.y + geom.h}" y2="${geom.y + geom.h}"/>`;
  const areaEl = area ? `<path class="area" d="${area}"/>` : '';
  const lineEl = line ? `<path class="line" d="${line}"/>` : '';
  const emptyEl =
    inRange.length === 0
      ? `<text class="empty" x="${width / 2}" y="${geom.y + geom.h / 2 + 6}" text-anchor="middle">Sparkline grows as the card is viewed</text>`
      : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="fs-fill" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${tokens.accent}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${tokens.accent}" stop-opacity="0.05"/>
    </linearGradient>
    <style>
      .bg { fill: ${tokens.background}; }
      .border { fill: none; stroke: ${tokens.border}; stroke-width: 1; }
      .title { fill: ${tokens.text}; font: 600 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .value { fill: ${tokens.accent}; font: 700 22px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .label { fill: ${tokens.muted}; font: 500 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .delta { font: 600 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .delta.up { fill: #3fb950; }
      .delta.down { fill: #f85149; }
      .baseline { stroke: ${tokens.border}; stroke-width: 1; }
      .area { fill: url(#fs-fill); }
      .line { fill: none; stroke: ${tokens.accent}; stroke-width: 1.75; stroke-linejoin: round; stroke-linecap: round; }
      .empty { fill: ${tokens.muted}; font: 500 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    </style>
  </defs>
  <rect class="bg" x="0.5" y="0.5" rx="8" ry="8" width="${width - 1}" height="${height - 1}" />
  <rect class="border" x="0.5" y="0.5" rx="8" ry="8" width="${width - 1}" height="${height - 1}" />
  <text class="title" x="${padX}" y="22">${title}</text>
  ${headline}
  ${baseLine}
  ${areaEl}
  ${lineEl}
  ${emptyEl}
</svg>`;
}

function deltaSign(delta: number): string {
  if (delta > 0) return '↑';
  if (delta < 0) return '↓';
  return '·';
}
