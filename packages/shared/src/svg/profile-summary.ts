import { escapeXml } from '../escape-xml';
import { type ThemeName, type ThemeTokens, resolveTheme } from '../themes';
import type { ProfileSummaryConfig } from '../zod/card-config';

export interface ContributionPoint {
  date: string;
  count: number;
}

export interface ProfileSummaryData {
  login: string;
  publicRepos: number;
  totalThisYear: number;
  joinedAt: string | null;
  contributions: ContributionPoint[];
}

export interface RenderOptions {
  width?: number;
  height?: number;
  hide?: Set<string>;
  now?: Date;
}

const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 320;

const MS_PER_DAY = 86_400_000;

function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 2 : 1).replace(/\.?0+$/, '')}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

function yearsBetween(from: Date, to: Date): number {
  let years = to.getUTCFullYear() - from.getUTCFullYear();
  const monthDiff = to.getUTCMonth() - from.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && to.getUTCDate() < from.getUTCDate())) {
    years -= 1;
  }
  return Math.max(0, years);
}

function joinedLabel(joinedAt: string | null, now: Date): string {
  if (!joinedAt) return 'GitHub member';
  const d = new Date(joinedAt);
  if (Number.isNaN(d.getTime())) return 'GitHub member';
  const years = yearsBetween(d, now);
  if (years <= 0) {
    const months = Math.max(
      1,
      (now.getUTCFullYear() - d.getUTCFullYear()) * 12 + (now.getUTCMonth() - d.getUTCMonth()),
    );
    return `Joined GitHub ${months} month${months === 1 ? '' : 's'} ago`;
  }
  return `Joined GitHub ${years} year${years === 1 ? '' : 's'} ago`;
}

interface Tick {
  value: number;
  label: string;
}

function niceTicks(max: number, count = 4): Tick[] {
  if (max <= 0) return [{ value: 0, label: '0' }];
  const rawStep = max / count;
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const norm = rawStep / mag;
  const niceStep = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const niceMax = Math.ceil(max / niceStep) * niceStep;
  const ticks: Tick[] = [];
  for (let v = niceStep; v <= niceMax + 1e-6; v += niceStep) {
    ticks.push({ value: v, label: compact(Math.round(v)) });
  }
  return ticks;
}

function monthShort(date: Date): string {
  const yy = String(date.getUTCFullYear() % 100).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}/${mm}`;
}

interface ChartGeom {
  x: number;
  y: number;
  w: number;
  h: number;
}

function buildAreaPath(
  points: ContributionPoint[],
  geom: ChartGeom,
  maxY: number,
  now: Date,
): {
  area: string;
  line: string;
} {
  if (points.length === 0 || maxY <= 0) {
    return { area: '', line: '' };
  }
  const endMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startMs = endMs - 365 * MS_PER_DAY;
  const span = endMs - startMs;

  const coords: Array<[number, number]> = [];
  for (const p of points) {
    const t = new Date(`${p.date}T00:00:00Z`).getTime();
    if (Number.isNaN(t) || t < startMs || t > endMs) continue;
    const px = geom.x + ((t - startMs) / span) * geom.w;
    const py = geom.y + geom.h - (p.count / maxY) * geom.h;
    coords.push([px, py]);
  }
  if (coords.length === 0) return { area: '', line: '' };

  const linePts = coords.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L ');
  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  const baseY = geom.y + geom.h;
  const area = `M ${first[0].toFixed(2)},${baseY.toFixed(2)} L ${linePts} L ${last[0].toFixed(2)},${baseY.toFixed(2)} Z`;
  const line = `M ${linePts}`;
  return { area, line };
}

function smoothDaily(points: ContributionPoint[], windowDays = 7): ContributionPoint[] {
  if (points.length < windowDays) return points;
  const out: ContributionPoint[] = [];
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    sum += points[i]!.count;
    if (i >= windowDays) sum -= points[i - windowDays]!.count;
    const denom = Math.min(i + 1, windowDays);
    out.push({ date: points[i]!.date, count: sum / denom });
  }
  return out;
}

export function renderProfileSummary(
  config: ProfileSummaryConfig,
  data: ProfileSummaryData,
  opts: RenderOptions = {},
): string {
  const width = opts.width ?? DEFAULT_WIDTH;
  const height = opts.height ?? DEFAULT_HEIGHT;
  const tokens: ThemeTokens = resolveTheme(config.theme as ThemeName, config.overrides);
  const now = opts.now ?? new Date();
  const hidden = opts.hide ?? new Set<string>();
  const title = escapeXml(config.title ?? data.login);

  const showContrib = config.show.contributions && !hidden.has('contributions');
  const showRepos = config.show.repos && !hidden.has('repos');
  const showJoined = config.show.joined && !hidden.has('joined');
  const showChart = config.show.chart && !hidden.has('chart');

  const padX = 32;
  const padY = 28;
  const leftColW = Math.min(360, Math.round(width * 0.36));

  const year = now.getUTCFullYear();
  const stats = [
    showContrib && {
      icon: 'github',
      label: `${compact(data.totalThisYear)} Contributions in ${year}`,
    },
    showRepos && {
      icon: 'repos',
      label: `${data.publicRepos} Public Repo${data.publicRepos === 1 ? '' : 's'}`,
    },
    showJoined && {
      icon: 'clock',
      label: joinedLabel(data.joinedAt, now),
    },
  ].filter((s): s is { icon: string; label: string } => Boolean(s));

  const titleY = padY + 32;
  const statsTopY = titleY + 40;
  const rowGap = 32;
  const rows = stats
    .map((s, i) => {
      const y = statsTopY + i * rowGap;
      const icon = iconPath(s.icon, padX, y - 12, tokens.muted);
      return `<g><title>${escapeXml(s.label)}</title>${icon}<text class="stat" x="${padX + 26}" y="${y}">${escapeXml(s.label)}</text></g>`;
    })
    .join('\n  ');

  let chartGroup = '';
  if (showChart) {
    const chartX = leftColW;
    const yAxisW = 36;
    const chartTopPad = padY + 48;
    const chartBottomPad = 36;
    const geom: ChartGeom = {
      x: chartX,
      y: chartTopPad,
      w: width - chartX - yAxisW - padX,
      h: height - chartTopPad - chartBottomPad,
    };

    const daily = smoothDaily(data.contributions, 7);
    const peak = daily.reduce((m, p) => (p.count > m ? p.count : m), 0);
    const ticks = niceTicks(peak, 4);
    const maxY = ticks.length > 0 ? ticks[ticks.length - 1]!.value : 0;

    const { area, line } = buildAreaPath(daily, geom, maxY, now);

    const gridLines = ticks
      .map((t) => {
        const y = geom.y + geom.h - (t.value / maxY) * geom.h;
        return `<line class="grid" x1="${geom.x}" x2="${geom.x + geom.w}" y1="${y.toFixed(2)}" y2="${y.toFixed(2)}"/><text class="axis" x="${geom.x + geom.w + 6}" y="${(y + 4).toFixed(2)}">${escapeXml(t.label)}</text>`;
      })
      .join('');

    const monthTickCount = 7;
    const monthTicks: string[] = [];
    const endMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const startMs = endMs - 365 * MS_PER_DAY;
    for (let i = 0; i < monthTickCount; i += 1) {
      const frac = i / (monthTickCount - 1);
      const t = startMs + frac * (endMs - startMs);
      const px = geom.x + frac * geom.w;
      const label = monthShort(new Date(t));
      monthTicks.push(
        `<text class="axis" x="${px.toFixed(2)}" y="${(geom.y + geom.h + 18).toFixed(2)}" text-anchor="middle">${escapeXml(label)}</text>`,
      );
    }

    const baseLine = `<line class="baseline" x1="${geom.x}" x2="${geom.x + geom.w}" y1="${geom.y + geom.h}" y2="${geom.y + geom.h}"/>`;
    const areaPath = area ? `<path class="area" d="${area}"/>` : '';
    const linePath = line ? `<path class="line" d="${line}"/>` : '';
    const chartLabel = `<text class="muted-sm" x="${geom.x}" y="${padY + 24}">contributions in the last year</text>`;

    chartGroup = `${chartLabel}${gridLines}${baseLine}${areaPath}${linePath}${monthTicks.join('')}`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="ps-fill" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#2ea043" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#2ea043" stop-opacity="0.15"/>
    </linearGradient>
    <style>
      .bg { fill: ${tokens.background}; }
      .border { fill: none; stroke: ${tokens.border}; stroke-width: 1; }
      .title { fill: ${tokens.accent}; font: 700 30px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .stat { fill: ${tokens.text}; font: 500 15px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .muted-sm { fill: ${tokens.muted}; font: 500 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .axis { fill: ${tokens.muted}; font: 500 11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .grid { stroke: ${tokens.border}; stroke-width: 1; stroke-dasharray: 2 4; }
      .baseline { stroke: ${tokens.border}; stroke-width: 1; }
      .area { fill: url(#ps-fill); }
      .line { fill: none; stroke: #2ea043; stroke-width: 1.5; stroke-linejoin: round; stroke-linecap: round; }
      .ico { fill: none; stroke: ${tokens.muted}; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
    </style>
  </defs>
  <rect class="bg" x="0.5" y="0.5" rx="10" ry="10" width="${width - 1}" height="${height - 1}" />
  <rect class="border" x="0.5" y="0.5" rx="10" ry="10" width="${width - 1}" height="${height - 1}" />
  <text class="title" x="${padX}" y="${titleY}">${title}</text>
  ${rows}
  ${chartGroup}
</svg>`;
}

function iconPath(name: string, x: number, y: number, _stroke: string): string {
  if (name === 'github') {
    return `<g transform="translate(${x},${y})"><path class="ico" d="M8 0.4a7.6 7.6 0 0 0-2.4 14.8c.38.07.52-.16.52-.36v-1.3c-2.12.46-2.57-1-2.57-1a2 2 0 0 0-.85-1.12c-.7-.48.05-.47.05-.47a1.6 1.6 0 0 1 1.16.78 1.62 1.62 0 0 0 2.22.63 1.62 1.62 0 0 1 .48-1.02c-1.7-.2-3.48-.85-3.48-3.78a3 3 0 0 1 .8-2.06 2.78 2.78 0 0 1 .08-2.04s.66-.21 2.16.78a7.46 7.46 0 0 1 3.92 0c1.5-.99 2.16-.78 2.16-.78.43.97.16 1.83.08 2.04a3 3 0 0 1 .8 2.06c0 2.94-1.79 3.58-3.49 3.77a1.82 1.82 0 0 1 .52 1.41v2.1c0 .2.14.44.52.36A7.6 7.6 0 0 0 8 0.4z"/></g>`;
  }
  if (name === 'repos') {
    return `<g transform="translate(${x},${y})"><path class="ico" d="M2 2.5A1.5 1.5 0 0 1 3.5 1h9A1.5 1.5 0 0 1 14 2.5v10.25a.75.75 0 0 1-1.16.62L8 10.31l-4.84 3.06A.75.75 0 0 1 2 12.75V2.5z"/></g>`;
  }
  if (name === 'clock') {
    return `<g transform="translate(${x},${y})"><circle class="ico" cx="8" cy="8" r="6.5"/><path class="ico" d="M8 4.5V8l2.5 1.5"/></g>`;
  }
  return '';
}
