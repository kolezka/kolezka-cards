import { describe, expect, it } from 'bun:test';
import { FollowersSparklineConfig } from '../zod/card-config';
import { daysForPeriod, renderFollowersSparkline } from './followers-sparkline';

const now = new Date('2026-05-13T00:00:00Z');

function trail(days: number, start: number, step = 2): Array<{ day: string; followers: number }> {
  const out: Array<{ day: string; followers: number }> = [];
  const endMs = Date.UTC(2026, 4, 13);
  for (let i = days; i >= 0; i -= 1) {
    const d = new Date(endMs - i * 86_400_000);
    out.push({ day: d.toISOString().slice(0, 10), followers: start + (days - i) * step });
  }
  return out;
}

describe('daysForPeriod', () => {
  it('maps presets', () => {
    expect(daysForPeriod('30d')).toBe(30);
    expect(daysForPeriod('90d')).toBe(90);
    expect(daysForPeriod('365d')).toBe(365);
    expect(daysForPeriod('all')).toBeGreaterThan(10_000);
  });
});

describe('renderFollowersSparkline', () => {
  it('renders a well-formed SVG with current count and period label', () => {
    const cfg = FollowersSparklineConfig.parse({ type: 'followers-sparkline' });
    const data = {
      login: 'octocat',
      history: trail(90, 100),
      currentFollowers: 280,
    };
    const svg = renderFollowersSparkline(cfg, data, { now });
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg).toContain('280');
    expect(svg).toContain('last 90 days');
    expect(svg).toContain('class="line"');
  });

  it('shows a positive delta label when followers grew', () => {
    const cfg = FollowersSparklineConfig.parse({ type: 'followers-sparkline', period: '30d' });
    const data = {
      login: 'octocat',
      history: trail(30, 50, 1),
      currentFollowers: 80,
    };
    const svg = renderFollowersSparkline(cfg, data, { now });
    expect(svg).toContain('+30');
    expect(svg).toContain('↑');
  });

  it('shows a negative delta label when followers dropped', () => {
    const cfg = FollowersSparklineConfig.parse({ type: 'followers-sparkline', period: '30d' });
    const data = {
      login: 'octocat',
      history: [
        { day: '2026-04-15', followers: 100 },
        { day: '2026-05-13', followers: 70 },
      ],
      currentFollowers: 70,
    };
    const svg = renderFollowersSparkline(cfg, data, { now });
    expect(svg).toContain('30');
    expect(svg).toContain('↓');
  });

  it('shows empty state hint when history is empty', () => {
    const cfg = FollowersSparklineConfig.parse({ type: 'followers-sparkline' });
    const svg = renderFollowersSparkline(
      cfg,
      { login: 'octocat', history: [], currentFollowers: 42 },
      { now },
    );
    expect(svg).toContain('Sparkline grows');
  });

  it('handles a single data point without crashing', () => {
    const cfg = FollowersSparklineConfig.parse({ type: 'followers-sparkline' });
    const svg = renderFollowersSparkline(
      cfg,
      {
        login: 'octocat',
        history: [{ day: '2026-05-13', followers: 100 }],
        currentFollowers: 100,
      },
      { now },
    );
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg).toContain('class="line"');
  });

  it("'all' period uses tightened time bounds from data", () => {
    const cfg = FollowersSparklineConfig.parse({ type: 'followers-sparkline', period: 'all' });
    const data = {
      login: 'octocat',
      history: [
        { day: '2024-06-01', followers: 10 },
        { day: '2026-05-12', followers: 200 },
      ],
      currentFollowers: 200,
    };
    const svg = renderFollowersSparkline(cfg, data, { now });
    expect(svg).toContain('all time');
    expect(svg).toContain('class="line"');
  });

  it('respects custom dimensions', () => {
    const cfg = FollowersSparklineConfig.parse({ type: 'followers-sparkline' });
    const svg = renderFollowersSparkline(
      cfg,
      { login: 'octocat', history: trail(30, 100), currentFollowers: 160 },
      { now, width: 600, height: 220 },
    );
    expect(svg).toContain('width="600"');
    expect(svg).toContain('height="220"');
  });

  it('escapes a malicious title', () => {
    const cfg = FollowersSparklineConfig.parse({
      type: 'followers-sparkline',
      title: '<img src=x onerror=alert(1)>',
    });
    const svg = renderFollowersSparkline(
      cfg,
      { login: 'octocat', history: trail(30, 100), currentFollowers: 160 },
      { now },
    );
    expect(svg).not.toContain('<img');
    expect(svg).toContain('&lt;img');
  });
});
