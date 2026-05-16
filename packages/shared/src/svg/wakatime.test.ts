import { describe, expect, it } from 'bun:test';
import { WakatimeConfig } from '../zod/card-config';
import { renderWakatime } from './wakatime';

const data = {
  login: 'octocat',
  totalSeconds: 26 * 3600 + 12 * 60, // 26h 12m
  languages: [
    { name: 'TypeScript', seconds: 14 * 3600, percent: 53.8 },
    { name: 'Svelte', seconds: 7 * 3600, percent: 26.9 },
    { name: 'Rust', seconds: 5 * 3600 + 12 * 60, percent: 19.3 },
  ],
};

const baseCfg = (overrides?: Partial<{ range: string; limit: number }>) =>
  WakatimeConfig.parse({
    type: 'wakatime',
    apiKey: 'waka_secret_1234567890abcdef',
    ...overrides,
  });

describe('renderWakatime', () => {
  it('renders a well-formed SVG with total + per-language bars', () => {
    const svg = renderWakatime(baseCfg(), data);
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    // 26h 12m → formatDuration switches to days at 24h so "1.1d" is expected
    expect(svg).toContain('1.1d');
    expect(svg).toContain('TypeScript');
    expect(svg).toContain('53.8%');
  });

  it('uses range in title and label', () => {
    const svg30 = renderWakatime(baseCfg({ range: 'last_30_days' }), data);
    expect(svg30).toContain('last 30 days');
    const svg6m = renderWakatime(baseCfg({ range: 'last_6_months' }), data);
    expect(svg6m).toContain('last 6 months');
  });

  it('caps to `limit`', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      name: `Lang${i}`,
      seconds: 100,
      percent: 10,
    }));
    const svg = renderWakatime(baseCfg({ limit: 3 }), { ...data, languages: many });
    expect(svg).toContain('Lang0');
    expect(svg).toContain('Lang2');
    expect(svg).not.toContain('Lang3');
  });

  it('renders empty state when no activity', () => {
    const svg = renderWakatime(baseCfg(), { login: 'octocat', totalSeconds: 0, languages: [] });
    expect(svg).toContain('No Wakatime activity');
  });

  it('formats short durations in minutes', () => {
    const svg = renderWakatime(baseCfg(), {
      login: 'octocat',
      totalSeconds: 45 * 60,
      languages: [{ name: 'TypeScript', seconds: 45 * 60, percent: 100 }],
    });
    expect(svg).toContain('45m');
  });

  it('formats very long durations in days', () => {
    const svg = renderWakatime(baseCfg({ range: 'last_year' }), {
      login: 'octocat',
      totalSeconds: 80 * 24 * 3600,
      languages: [{ name: 'TypeScript', seconds: 80 * 24 * 3600, percent: 100 }],
    });
    expect(svg).toContain('d');
  });

  it('escapes a malicious title', () => {
    const cfg = WakatimeConfig.parse({
      type: 'wakatime',
      apiKey: 'waka_secret_1234567890abcdef',
      title: '<img src=x>',
    });
    const svg = renderWakatime(cfg, data);
    expect(svg).not.toContain('<img');
    expect(svg).toContain('&lt;img');
  });

  it('respects custom dimensions', () => {
    const svg = renderWakatime(baseCfg(), data, { width: 600, height: 280 });
    expect(svg).toContain('width="600"');
    expect(svg).toContain('height="280"');
  });
});
