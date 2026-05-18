import { escapeXml } from '../escape-xml';
import { type ThemeName, type ThemeTokens, resolveTheme } from '../themes';
import type {
  BadgeBlock,
  Block,
  BlockSource,
  CustomConfig,
  DividerBlock,
  ImageBlock,
  SparklineBlock,
  StatBlock,
  TextBlock,
} from '../zod/card-config';

/** All data the custom renderer can pull from. Anything not present is
 *  rendered as a placeholder ("—") rather than failing the request. */
export interface CustomData {
  visits?: { total: number; unique: number };
  github?: {
    stars?: number;
    followers?: number;
    repos?: number;
    gists?: number;
    contributionsYear?: number;
    topLanguage?: string;
  };
  followersHistory?: Array<{ day: string; followers: number }>;
  contributionsHistory?: Array<{ date: string; count: number }>;
  currentFollowers?: number;
}

export interface RenderOptions {
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 300;
const MS_PER_DAY = 86_400_000;

const TEXT_SIZE_PX: Record<TextBlock['size'], number> = {
  s: 11,
  m: 14,
  l: 20,
  xl: 28,
};

function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

const PLACEHOLDER = '—';

function resolveSource(source: BlockSource, literal: string, data: CustomData): string {
  switch (source) {
    case 'literal':
      return literal;
    case 'visits.total':
      return data.visits ? compact(data.visits.total) : PLACEHOLDER;
    case 'visits.unique':
      return data.visits ? compact(data.visits.unique) : PLACEHOLDER;
    case 'github.stars':
      return data.github?.stars !== undefined ? compact(data.github.stars) : PLACEHOLDER;
    case 'github.followers':
      return data.github?.followers !== undefined ? compact(data.github.followers) : PLACEHOLDER;
    case 'github.repos':
      return data.github?.repos !== undefined ? compact(data.github.repos) : PLACEHOLDER;
    case 'github.gists':
      return data.github?.gists !== undefined ? compact(data.github.gists) : PLACEHOLDER;
    case 'github.contributions.year':
      return data.github?.contributionsYear !== undefined
        ? compact(data.github.contributionsYear)
        : PLACEHOLDER;
    case 'github.top.language':
      return data.github?.topLanguage ?? PLACEHOLDER;
  }
}

function tokenColor(color: TextBlock['color'], tokens: ThemeTokens): string {
  switch (color) {
    case 'text':
      return tokens.text;
    case 'muted':
      return tokens.muted;
    case 'accent':
      return tokens.accent;
  }
}

function alignAnchor(align: TextBlock['align']): { anchor: string; xFactor: number } {
  switch (align) {
    case 'left':
      return { anchor: 'start', xFactor: 0 };
    case 'center':
      return { anchor: 'middle', xFactor: 0.5 };
    case 'right':
      return { anchor: 'end', xFactor: 1 };
  }
}

function renderTextBlock(b: TextBlock, tokens: ThemeTokens): string {
  const fontSize = TEXT_SIZE_PX[b.size];
  const fill = tokenColor(b.color, tokens);
  const { anchor, xFactor } = alignAnchor(b.align);
  const cx = b.x + b.w * xFactor;
  // Baseline of a centered single-line text inside the block.
  const cy = b.y + b.h / 2 + fontSize * 0.35;
  const weight = b.weight === 'bold' ? 700 : 500;
  return `<text x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" text-anchor="${anchor}" fill="${fill}" font-size="${fontSize}" font-weight="${weight}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif">${escapeXml(b.text)}</text>`;
}

function renderStatBlock(b: StatBlock, data: CustomData, tokens: ThemeTokens): string {
  const value = resolveSource(b.source, b.literal, data);
  const valueFs = Math.max(18, Math.min(40, Math.floor(b.h * 0.55)));
  const labelFs = Math.max(10, Math.min(14, Math.floor(b.h * 0.18)));
  const valueY = b.y + b.h * 0.55;
  const labelY = b.y + b.h * 0.85;
  return `<g>
    <text x="${b.x + b.w / 2}" y="${valueY.toFixed(2)}" text-anchor="middle" fill="${tokens.accent}" font-size="${valueFs}" font-weight="700" font-family="ui-sans-serif, system-ui, sans-serif">${escapeXml(value)}</text>
    <text x="${b.x + b.w / 2}" y="${labelY.toFixed(2)}" text-anchor="middle" fill="${tokens.muted}" font-size="${labelFs}" font-weight="500" font-family="ui-sans-serif, system-ui, sans-serif">${escapeXml(b.label)}</text>
  </g>`;
}

function renderBadgeBlock(b: BadgeBlock, data: CustomData, tokens: ThemeTokens): string {
  const value = resolveSource(b.source, b.literal, data);
  // shields.io-style two-column pill: muted label on the left, accent value on the right.
  const fs = Math.max(10, Math.min(14, Math.floor(b.h * 0.45)));
  const splitX = b.x + b.w * 0.5;
  const r = Math.min(6, Math.floor(b.h / 4));
  return `<g>
    <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${r}" ry="${r}" fill="${tokens.background}" stroke="${tokens.border}" stroke-width="1"/>
    <rect x="${splitX}" y="${b.y}" width="${b.w / 2}" height="${b.h}" fill="${tokens.accent}" opacity="0.18"/>
    <line x1="${splitX}" y1="${b.y + 2}" x2="${splitX}" y2="${b.y + b.h - 2}" stroke="${tokens.border}" stroke-width="1"/>
    <text x="${b.x + b.w * 0.25}" y="${b.y + b.h * 0.66}" text-anchor="middle" fill="${tokens.muted}" font-size="${fs}" font-weight="600" font-family="ui-sans-serif, system-ui, sans-serif">${escapeXml(b.label)}</text>
    <text x="${b.x + b.w * 0.75}" y="${b.y + b.h * 0.66}" text-anchor="middle" fill="${tokens.accent}" font-size="${fs}" font-weight="700" font-family="ui-sans-serif, system-ui, sans-serif">${escapeXml(value)}</text>
  </g>`;
}

function renderDividerBlock(b: DividerBlock, tokens: ThemeTokens): string {
  const cy = b.y + b.h / 2;
  return `<line x1="${b.x}" x2="${b.x + b.w}" y1="${cy}" y2="${cy}" stroke="${tokens.border}" stroke-width="1"/>`;
}

function renderImageBlock(b: ImageBlock): string {
  if (!b.src) return '';
  // Use xlink:href as well for older renderers; preserveAspectRatio "xMidYMid meet"
  // keeps the image centered without distortion.
  return `<image x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" href="${escapeXml(b.src)}" preserveAspectRatio="xMidYMid meet" aria-label="${escapeXml(b.alt)}"/>`;
}

function renderSparklineBlock(
  b: SparklineBlock,
  data: CustomData,
  tokens: ThemeTokens,
  gradientId: string,
): string {
  // Pull the chosen series. If absent or empty, show an empty-state line.
  type Point = { t: number; v: number };
  let pts: Point[] = [];
  if (b.source === 'followers' && data.followersHistory) {
    pts = data.followersHistory.map((p) => ({
      t: new Date(`${p.day}T00:00:00Z`).getTime(),
      v: p.followers,
    }));
  } else if (b.source === 'contributions' && data.contributionsHistory) {
    pts = data.contributionsHistory.map((p) => ({
      t: new Date(`${p.date}T00:00:00Z`).getTime(),
      v: p.count,
    }));
  }
  // Filter to requested period (skip when 'all' or empty)
  if (b.period !== 'all' && pts.length > 0) {
    const days = b.period === '30d' ? 30 : b.period === '90d' ? 90 : 365;
    const cutoff = Date.now() - days * MS_PER_DAY;
    pts = pts.filter((p) => p.t >= cutoff);
  }
  pts.sort((a, b2) => a.t - b2.t);

  const labelFs = Math.max(10, Math.min(13, Math.floor(b.h * 0.16)));
  const headerH = b.label ? labelFs + 6 : 0;
  const geom = { x: b.x, y: b.y + headerH, w: b.w, h: Math.max(8, b.h - headerH) };
  const labelEl = b.label
    ? `<text x="${b.x}" y="${b.y + labelFs}" fill="${tokens.muted}" font-size="${labelFs}" font-weight="500" font-family="ui-sans-serif, system-ui, sans-serif">${escapeXml(b.label)}</text>`
    : '';

  if (pts.length < 2) {
    const baseline = `<line x1="${geom.x}" x2="${geom.x + geom.w}" y1="${geom.y + geom.h - 1}" y2="${geom.y + geom.h - 1}" stroke="${tokens.border}" stroke-width="1"/>`;
    const empty = `<text x="${geom.x + geom.w / 2}" y="${geom.y + geom.h / 2}" text-anchor="middle" fill="${tokens.muted}" font-size="${labelFs}" font-family="ui-sans-serif, system-ui, sans-serif">no data yet</text>`;
    return `<g>${labelEl}${baseline}${empty}</g>`;
  }

  const tMin = pts[0]!.t;
  const tMax = pts[pts.length - 1]!.t;
  const vMin = Math.min(...pts.map((p) => p.v));
  const vMax = Math.max(...pts.map((p) => p.v));
  const tSpan = Math.max(1, tMax - tMin);
  const vSpan = Math.max(1, vMax - vMin);
  const coords = pts.map((p) => {
    const px = geom.x + ((p.t - tMin) / tSpan) * geom.w;
    const py = geom.y + geom.h - ((p.v - vMin) / vSpan) * (geom.h - 2);
    return [px, py] as const;
  });
  const linePts = coords.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L ');
  const lineD = `M ${linePts}`;
  const baseY = geom.y + geom.h;
  const areaD = `M ${coords[0]![0].toFixed(2)},${baseY.toFixed(2)} L ${linePts} L ${coords[coords.length - 1]![0].toFixed(2)},${baseY.toFixed(2)} Z`;
  return `<g>
    ${labelEl}
    <path d="${areaD}" fill="url(#${gradientId})"/>
    <path d="${lineD}" fill="none" stroke="${tokens.accent}" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round"/>
  </g>`;
}

function renderBlock(
  block: Block,
  data: CustomData,
  tokens: ThemeTokens,
  gradientId: string,
): string {
  switch (block.kind) {
    case 'text':
      return renderTextBlock(block, tokens);
    case 'stat':
      return renderStatBlock(block, data, tokens);
    case 'badge':
      return renderBadgeBlock(block, data, tokens);
    case 'divider':
      return renderDividerBlock(block, tokens);
    case 'sparkline':
      return renderSparklineBlock(block, data, tokens, gradientId);
    case 'image':
      return renderImageBlock(block);
  }
}

export function renderCustom(
  config: CustomConfig,
  data: CustomData,
  opts: RenderOptions = {},
): string {
  const width = opts.width ?? config.size?.width ?? DEFAULT_WIDTH;
  const height = opts.height ?? config.size?.height ?? DEFAULT_HEIGHT;
  const tokens = resolveTheme(config.theme as ThemeName, config.overrides);
  const title = escapeXml(config.title ?? 'Custom card');
  const gradientId = 'cc-fill';

  const blocks = config.blocks.map((b) => renderBlock(b, data, tokens, gradientId)).join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="${gradientId}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${tokens.accent}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="${tokens.accent}" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" rx="8" ry="8" width="${width - 1}" height="${height - 1}" fill="${tokens.background}" stroke="${tokens.border}" stroke-width="1"/>
  ${blocks}
</svg>`;
}

/** Inspect the layout to decide which expensive data sources need to be
 *  fetched before calling renderCustom. Lets the route avoid hitting the
 *  GitHub API when no block needs it. */
export function neededSources(config: CustomConfig): {
  needsGithubUser: boolean;
  needsGithubRepos: boolean;
  needsContributions: boolean;
  needsFollowersHistory: boolean;
} {
  let needsGithubUser = false;
  let needsGithubRepos = false;
  let needsContributions = false;
  let needsFollowersHistory = false;
  for (const b of config.blocks) {
    if (b.kind === 'stat' || b.kind === 'badge') {
      if (b.source.startsWith('github.')) needsGithubUser = true;
      if (b.source === 'github.stars' || b.source === 'github.top.language')
        needsGithubRepos = true;
      if (b.source === 'github.contributions.year') needsContributions = true;
    }
    if (b.kind === 'sparkline') {
      if (b.source === 'followers') needsFollowersHistory = true;
      if (b.source === 'contributions') needsContributions = true;
    }
  }
  return { needsGithubUser, needsGithubRepos, needsContributions, needsFollowersHistory };
}
