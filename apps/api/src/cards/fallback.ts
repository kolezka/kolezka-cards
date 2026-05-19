import { escapeXml } from '@kc/shared/escape-xml';
import { type ThemeName, type ThemeTokens, resolveTheme } from '@kc/shared/themes';

interface FallbackConfig {
  theme?: string;
  title?: string;
  overrides?: Partial<ThemeTokens>;
  size?: { width?: number; height?: number };
}

const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 160;

/**
 * Graceful SVG shown when a card handler throws (typically: GitHub REST API
 * rate-limited, transient 5xx). Renders at the configured size + theme so it
 * slots into the README layout in place of the real card instead of producing
 * a broken-image icon. Includes a `data-fallback` attribute so the dashboard
 * can detect it.
 */
export function renderFallback(config: FallbackConfig, type: string): string {
  const themeName = (config.theme as ThemeName) ?? 'github_dark';
  const tokens = resolveTheme(themeName, config.overrides);
  const width = config.size?.width ?? DEFAULT_WIDTH;
  const height = config.size?.height ?? DEFAULT_HEIGHT;
  const title = escapeXml(config.title ?? type);

  // Layout: title top-left, message centered vertically below it. Stays
  // legible across the supported 200×80 → 1200×600 size range — at the
  // small end the title compresses but stays readable, at the large end
  // there's just more empty card.
  const padX = Math.min(24, Math.max(12, Math.floor(width * 0.04)));
  const titleY = Math.min(40, Math.max(20, Math.floor(height * 0.32)));
  const msgY = Math.min(height - 32, titleY + 36);
  const subY = msgY + 22;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title} (data unavailable)" data-fallback="github-unavailable" text-rendering="geometricPrecision" shape-rendering="geometricPrecision">
  <defs>
    <style>
      .bg { fill: ${tokens.background}; }
      .border { fill: none; stroke: ${tokens.border}; stroke-width: 1; }
      .title { fill: ${tokens.text}; font: 700 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .msg { fill: ${tokens.muted}; font: 500 13px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      .sub { fill: ${tokens.muted}; font: 500 11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    </style>
  </defs>
  <rect class="bg" x="0.5" y="0.5" rx="10" ry="10" width="${width - 1}" height="${height - 1}"/>
  <rect class="border" x="0.5" y="0.5" rx="10" ry="10" width="${width - 1}" height="${height - 1}"/>
  <text class="title" x="${padX}" y="${titleY}">${title}</text>
  <text class="msg" x="${padX}" y="${msgY}">GitHub data temporarily unavailable</text>
  <text class="sub" x="${padX}" y="${subY}">Will retry on the next visit</text>
</svg>`;
}
