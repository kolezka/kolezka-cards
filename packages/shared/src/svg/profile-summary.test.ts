import { describe, expect, it } from 'bun:test';
import { ProfileSummaryConfig } from '../zod/card-config';
import { daysFromPeriod, renderProfileSummary } from './profile-summary';

const now = new Date('2026-05-13T00:00:00Z');

function makeContribs(): Array<{ date: string; count: number }> {
  const out: Array<{ date: string; count: number }> = [];
  const end = Date.UTC(2026, 4, 13);
  for (let i = 365; i >= 0; i -= 1) {
    const t = new Date(end - i * 86_400_000);
    const dateKey = t.toISOString().slice(0, 10);
    out.push({ date: dateKey, count: Math.max(0, Math.round(50 + 30 * Math.sin(i / 30))) });
  }
  return out;
}

const data = {
  login: 'kolezka',
  publicRepos: 29,
  totalThisYear: 3460,
  joinedAt: '2017-04-10T12:00:00Z',
  contributions: makeContribs(),
};

describe('renderProfileSummary', () => {
  it('renders a well-formed SVG with all sections', () => {
    const cfg = ProfileSummaryConfig.parse({ type: 'profile-summary', theme: 'github_dark' });
    const svg = renderProfileSummary(cfg, data, { now });
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    expect(svg.includes('Contributions in 2026')).toBe(true);
    expect(svg.includes('29 Public Repos')).toBe(true);
    expect(svg.includes('Joined GitHub 9 years ago')).toBe(true);
    expect(svg.includes('contributions in the last year')).toBe(true);
  });

  it('compacts large contribution numbers', () => {
    const cfg = ProfileSummaryConfig.parse({ type: 'profile-summary', theme: 'github_dark' });
    const svg = renderProfileSummary(cfg, data, { now });
    expect(svg.includes('3.46k')).toBe(true);
  });

  it('pluralises Public Repo for count 1', () => {
    const cfg = ProfileSummaryConfig.parse({ type: 'profile-summary', theme: 'github_dark' });
    const svg = renderProfileSummary(cfg, { ...data, publicRepos: 1 }, { now });
    expect(svg.includes('1 Public Repo<')).toBe(true);
  });

  it('falls back to month-precision when joined within the year', () => {
    const cfg = ProfileSummaryConfig.parse({ type: 'profile-summary', theme: 'github_dark' });
    const svg = renderProfileSummary(cfg, { ...data, joinedAt: '2026-01-15T00:00:00Z' }, { now });
    expect(svg.includes('Joined GitHub 4 months ago')).toBe(true);
  });

  it('omits the chart when show.chart is false', () => {
    const cfg = ProfileSummaryConfig.parse({
      type: 'profile-summary',
      theme: 'github_dark',
      show: { contributions: true, repos: true, joined: true, chart: false },
    });
    const svg = renderProfileSummary(cfg, data, { now });
    expect(svg.includes('contributions in the last year')).toBe(false);
    expect(svg.includes('class="area"')).toBe(false);
  });

  it('omits stat rows when their show flag is false', () => {
    const cfg = ProfileSummaryConfig.parse({
      type: 'profile-summary',
      theme: 'github_dark',
      show: { contributions: false, repos: true, joined: false, chart: true },
    });
    const svg = renderProfileSummary(cfg, data, { now });
    expect(svg.includes('Contributions in 2026')).toBe(false);
    expect(svg.includes('Joined GitHub')).toBe(false);
    expect(svg.includes('Public Repos')).toBe(true);
  });

  it('honours opts.hide to suppress sections', () => {
    const cfg = ProfileSummaryConfig.parse({ type: 'profile-summary', theme: 'github_dark' });
    const svg = renderProfileSummary(cfg, data, { now, hide: new Set(['chart', 'joined']) });
    expect(svg.includes('contributions in the last year')).toBe(false);
    expect(svg.includes('Joined GitHub')).toBe(false);
    expect(svg.includes('Public Repos')).toBe(true);
  });

  it('escapes a malicious custom title', () => {
    const cfg = ProfileSummaryConfig.parse({
      type: 'profile-summary',
      theme: 'github_dark',
      title: '<img src=x onerror=alert(1)>',
    });
    const svg = renderProfileSummary(cfg, data, { now });
    expect(svg.includes('<img')).toBe(false);
    expect(svg.includes('&lt;img')).toBe(true);
  });

  it('escapes login when used as default title', () => {
    const cfg = ProfileSummaryConfig.parse({ type: 'profile-summary', theme: 'github_dark' });
    const svg = renderProfileSummary(cfg, { ...data, login: '</text><script>' }, { now });
    expect(svg.includes('<script>')).toBe(false);
    expect(svg.includes('&lt;script&gt;')).toBe(true);
  });

  it('applies theme overrides', () => {
    const cfg = ProfileSummaryConfig.parse({
      type: 'profile-summary',
      theme: 'github_dark',
      overrides: { accent: '#ff00aa' },
    });
    const svg = renderProfileSummary(cfg, data, { now });
    expect(svg.includes('#ff00aa')).toBe(true);
  });

  it('handles empty contribution data without throwing', () => {
    const cfg = ProfileSummaryConfig.parse({ type: 'profile-summary', theme: 'github_dark' });
    const svg = renderProfileSummary(
      cfg,
      { ...data, contributions: [], totalThisYear: 0 },
      { now },
    );
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg.includes('class="area"')).toBe(false);
  });

  it('renders gracefully when joinedAt is missing', () => {
    const cfg = ProfileSummaryConfig.parse({ type: 'profile-summary', theme: 'github_dark' });
    const svg = renderProfileSummary(cfg, { ...data, joinedAt: null }, { now });
    expect(svg.includes('GitHub member')).toBe(true);
  });
});

describe('daysFromPeriod', () => {
  it('maps preset names to expected day counts', () => {
    expect(daysFromPeriod('1m')).toBe(30);
    expect(daysFromPeriod('3m')).toBe(90);
    expect(daysFromPeriod('6m')).toBe(180);
    expect(daysFromPeriod('1y')).toBe(365);
    expect(daysFromPeriod('2y')).toBe(730);
  });

  it('returns custom days when given a {days} object', () => {
    expect(daysFromPeriod({ days: 45 })).toBe(45);
    expect(daysFromPeriod({ days: 1825 })).toBe(1825);
  });

  it("'all' derives span from first→last contribution dates", () => {
    const data = [
      { date: '2023-01-01', count: 1 },
      { date: '2024-01-01', count: 1 },
    ];
    const days = daysFromPeriod('all', data);
    // ~365 days between, depending on UTC: allow ±1
    expect(days).toBeGreaterThanOrEqual(365);
    expect(days).toBeLessThanOrEqual(367);
  });

  it("'all' falls back to 365 when data is empty", () => {
    expect(daysFromPeriod('all', [])).toBe(365);
    expect(daysFromPeriod('all', undefined)).toBe(365);
  });

  it('falls back to 365 when period is undefined', () => {
    expect(daysFromPeriod(undefined)).toBe(365);
  });
});

describe('renderProfileSummary period support', () => {
  it("uses '1y' label by default", () => {
    const cfg = ProfileSummaryConfig.parse({ type: 'profile-summary' });
    const svg = renderProfileSummary(cfg, data, { now });
    expect(svg).toContain('contributions in the last year');
  });

  it("'1m' label and day-of-month tick formatting", () => {
    const cfg = ProfileSummaryConfig.parse({ type: 'profile-summary', period: '1m' });
    const svg = renderProfileSummary(cfg, data, { now });
    expect(svg).toContain('contributions in the last month');
    // 1m uses MM/DD tick labels; existing yearly format YY/MM should not appear.
    // Pick a tick we know will exist: the rightmost tick equals 'now'.
    expect(svg).toContain('05/13');
  });

  it("'3m' label and tick formatting", () => {
    const cfg = ProfileSummaryConfig.parse({ type: 'profile-summary', period: '3m' });
    const svg = renderProfileSummary(cfg, data, { now });
    expect(svg).toContain('contributions in the last 3 months');
  });

  it("'2y' label", () => {
    const cfg = ProfileSummaryConfig.parse({ type: 'profile-summary', period: '2y' });
    const svg = renderProfileSummary(cfg, data, { now });
    expect(svg).toContain('contributions in the last 2 years');
  });

  it('custom {days: 45} produces "last 45 days" label', () => {
    const cfg = ProfileSummaryConfig.parse({ type: 'profile-summary', period: { days: 45 } });
    const svg = renderProfileSummary(cfg, data, { now });
    expect(svg).toContain('contributions in the last 45 days');
  });

  it('opts.period overrides config.period at render time', () => {
    const cfg = ProfileSummaryConfig.parse({ type: 'profile-summary', period: '1y' });
    const svg = renderProfileSummary(cfg, data, { now, period: '3m' });
    expect(svg).toContain('contributions in the last 3 months');
    expect(svg).not.toContain('contributions in the last year');
  });

  it('handles a period larger than available data without throwing', () => {
    const cfg = ProfileSummaryConfig.parse({ type: 'profile-summary', period: '2y' });
    // data has 366 points; 2y window means half the chart is empty — should still render
    const svg = renderProfileSummary(cfg, data, { now });
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg).toContain('contributions in the last 2 years');
  });

  it('handles sparse data inside a small window', () => {
    const sparse = [
      { date: '2026-05-01', count: 5 },
      { date: '2026-05-10', count: 3 },
    ];
    const cfg = ProfileSummaryConfig.parse({ type: 'profile-summary', period: '1m' });
    const svg = renderProfileSummary(
      cfg,
      { ...data, contributions: sparse, totalThisYear: 8 },
      { now },
    );
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg).toContain('contributions in the last month');
  });
});
