import { escapeXml } from '../escape-xml';
import { type ThemeName, type ThemeTokens, resolveTheme } from '../themes';
import type { ProfileViewsConfig } from '../zod/card-config';

export interface ProfileViewsData {
  views: number;
}

export interface RenderOptions {
  width?: number;
  height?: number;
}

// Compact, shield-style badge. Tall enough to be legible in a README header
// line, narrow enough to sit next to other badges.
const DEFAULT_WIDTH = 220;
const DEFAULT_HEIGHT = 40;

function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

export function renderProfileViews(
  config: ProfileViewsConfig,
  data: ProfileViewsData,
  opts: RenderOptions = {},
): string {
  const width = opts.width ?? DEFAULT_WIDTH;
  const height = opts.height ?? DEFAULT_HEIGHT;
  const tokens: ThemeTokens = resolveTheme(config.theme as ThemeName, config.overrides);
  const label = escapeXml(config.title ?? 'Profile views');
  const value = compact(data.views);
  const padX = Math.max(10, Math.round(width * 0.06));
  const baselineY = Math.round(height * 0.62);
  const valueFontPx = Math.min(20, Math.max(13, Math.round(height * 0.42)));
  const labelFontPx = Math.min(13, Math.max(10, Math.round(height * 0.3)));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}: ${escapeXml(value)}">
  <defs>
    <style>
      .bg { fill: ${tokens.background}; }
      .border { fill: none; stroke: ${tokens.border}; stroke-width: 1; }
      .label { fill: ${tokens.muted}; font: 600 ${labelFontPx}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; letter-spacing: 0.02em; }
      .value { fill: ${tokens.accent}; font: 700 ${valueFontPx}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    </style>
  </defs>
  <rect class="bg" x="0.5" y="0.5" rx="6" ry="6" width="${width - 1}" height="${height - 1}" />
  <rect class="border" x="0.5" y="0.5" rx="6" ry="6" width="${width - 1}" height="${height - 1}" />
  <text class="label" x="${padX}" y="${baselineY}">${label}</text>
  <text class="value" x="${width - padX}" y="${baselineY}" text-anchor="end">${escapeXml(value)}</text>
</svg>`;
}
