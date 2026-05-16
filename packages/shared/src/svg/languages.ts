import { escapeXml } from '../escape-xml';
import { type ThemeName, type ThemeTokens, resolveTheme } from '../themes';
import type { LanguagesConfig } from '../zod/card-config';
import { languageColor } from './language-colors';

export interface LanguageEntry {
  name: string;
  bytes: number;
}

export interface LanguagesData {
  login: string;
  languages: LanguageEntry[];
}

export interface RenderOptions {
  width?: number;
  height?: number;
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 220;

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const a0 = ((startAngle - 90) * Math.PI) / 180;
  const a1 = ((endAngle - 90) * Math.PI) / 180;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export function renderLanguages(
  config: LanguagesConfig,
  data: LanguagesData,
  opts: RenderOptions = {},
): string {
  const width = opts.width ?? DEFAULT_WIDTH;
  const height = opts.height ?? DEFAULT_HEIGHT;
  const tokens: ThemeTokens = resolveTheme(config.theme as ThemeName, config.overrides);
  const title = escapeXml(config.title ?? `${data.login}'s top languages`);

  const langs = data.languages
    .slice()
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, config.limit);
  const totalBytes = langs.reduce((sum, l) => sum + l.bytes, 0);

  const bodyY = 56;
  const bodyContent =
    totalBytes === 0
      ? renderEmpty(width, height, tokens)
      : config.style === 'donut'
        ? renderDonut(langs, totalBytes, width, height, bodyY, tokens)
        : renderBar(langs, totalBytes, width, height, bodyY, tokens);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}">
  <defs>
    <style>
      .bg { fill: ${tokens.background}; }
      .border { fill: none; stroke: ${tokens.border}; stroke-width: 1; }
      .title { fill: ${tokens.text}; font: 600 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .legend { fill: ${tokens.text}; font: 500 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .legend-pct { fill: ${tokens.muted}; font: 500 11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .empty { fill: ${tokens.muted}; font: 500 13px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    </style>
  </defs>
  <rect class="bg" x="0.5" y="0.5" rx="8" ry="8" width="${width - 1}" height="${height - 1}" />
  <rect class="border" x="0.5" y="0.5" rx="8" ry="8" width="${width - 1}" height="${height - 1}" />
  <text class="title" x="24" y="32">${title}</text>
  ${bodyContent}
</svg>`;
}

function renderEmpty(width: number, height: number, _tokens: ThemeTokens): string {
  return `<text class="empty" x="${width / 2}" y="${height / 2 + 6}" text-anchor="middle">No language data</text>`;
}

function renderBar(
  langs: LanguageEntry[],
  totalBytes: number,
  width: number,
  height: number,
  bodyY: number,
  _tokens: ThemeTokens,
): string {
  const padX = 24;
  const barW = width - padX * 2;
  const barH = 14;
  let cursor = 0;
  const segments = langs
    .map((l) => {
      const w = Math.max(2, Math.round((l.bytes / totalBytes) * barW));
      const seg = `<rect x="${padX + cursor}" y="${bodyY}" width="${w}" height="${barH}" fill="${languageColor(l.name)}" rx="3" ry="3"><title>${escapeXml(l.name)}: ${((l.bytes / totalBytes) * 100).toFixed(1)}%</title></rect>`;
      cursor += w;
      return seg;
    })
    .join('');

  // Legend grid: 2 columns
  const legendStartY = bodyY + barH + 24;
  const cols = 2;
  const colW = (width - padX * 2) / cols;
  const rowH = 22;
  const legend = langs
    .map((l, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const lx = padX + col * colW;
      const ly = legendStartY + row * rowH;
      const pct = ((l.bytes / totalBytes) * 100).toFixed(1);
      return `<g transform="translate(${lx},${ly})">
        <rect width="10" height="10" fill="${languageColor(l.name)}" rx="2"/>
        <text class="legend" x="16" y="9">${escapeXml(l.name)}</text>
        <text class="legend-pct" x="${colW - 8}" y="9" text-anchor="end">${pct}%</text>
      </g>`;
    })
    .join('');

  return `${segments}${legend}`;
}

function renderDonut(
  langs: LanguageEntry[],
  totalBytes: number,
  width: number,
  height: number,
  bodyY: number,
  tokens: ThemeTokens,
): string {
  const availH = height - bodyY - 24;
  const r = Math.max(40, Math.min(80, Math.floor(availH / 2) - 8));
  const cx = 24 + r + 8;
  const cy = bodyY + r + 8;
  const stroke = Math.max(10, Math.floor(r / 3));

  // Build arcs
  let acc = 0;
  const arcs = langs
    .map((l) => {
      const fraction = l.bytes / totalBytes;
      const start = (acc / totalBytes) * 360;
      const end = ((acc + l.bytes) / totalBytes) * 360;
      acc += l.bytes;
      // describeArc fails when start==end-360 (full circle); cap at 359.99
      const safeEnd = end - start >= 359.99 ? start + 359.99 : end;
      const pct = (fraction * 100).toFixed(1);
      return `<path d="${describeArc(cx, cy, r - stroke / 2, start, safeEnd)}" stroke="${languageColor(l.name)}" stroke-width="${stroke}" fill="none" stroke-linecap="butt"><title>${escapeXml(l.name)}: ${pct}%</title></path>`;
    })
    .join('');

  // Legend right of donut
  const legendX = cx + r + 24;
  const legendW = width - legendX - 16;
  const rowH = 22;
  const maxRows = Math.max(1, Math.floor((availH - 4) / rowH));
  const visible = langs.slice(0, maxRows);
  const legend = visible
    .map((l, i) => {
      const ly = bodyY + 6 + i * rowH;
      const pct = ((l.bytes / totalBytes) * 100).toFixed(1);
      return `<g transform="translate(${legendX},${ly})">
        <rect width="10" height="10" fill="${languageColor(l.name)}" rx="2"/>
        <text class="legend" x="16" y="9">${escapeXml(l.name)}</text>
        <text class="legend-pct" x="${legendW - 8}" y="9" text-anchor="end">${pct}%</text>
      </g>`;
    })
    .join('');

  // Center label: number of languages or top language
  const top = langs[0]!;
  const centerLabel = `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="${tokens.accent}" font-family="ui-sans-serif, system-ui" font-size="13" font-weight="700">${escapeXml(top.name)}</text>`;

  return `${arcs}${centerLabel}${legend}`;
}
