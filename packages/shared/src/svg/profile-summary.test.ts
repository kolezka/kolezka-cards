import { describe, expect, it } from 'bun:test';
import { ProfileSummaryConfig } from '../zod/card-config';
import { renderProfileSummary } from './profile-summary';

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
