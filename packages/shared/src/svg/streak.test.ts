import { describe, expect, it } from 'bun:test';
import { StreakConfig } from '../zod/card-config';
import { renderStreak } from './streak';

const data = {
  login: 'octocat',
  totalThisYear: 1234,
  currentStreak: 7,
  longestStreak: 42,
  currentStreakStart: '2026-05-05',
  longestStreakStart: '2024-01-01',
  longestStreakEnd: '2024-02-11',
};

describe('renderStreak', () => {
  it('renders a well-formed SVG with the three streak stats', () => {
    const cfg = StreakConfig.parse({ type: 'streak', theme: 'github_dark' });
    const svg = renderStreak(cfg, data);
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    expect(svg.includes('1234')).toBe(true);
    expect(svg.includes('42')).toBe(true);
    expect(svg.includes('2026-05-05')).toBe(true);
    expect(svg.includes('2024-01-01 → 2024-02-11')).toBe(true);
  });

  it('falls back to em-dash when no current streak', () => {
    const cfg = StreakConfig.parse({ type: 'streak', theme: 'github_dark' });
    const svg = renderStreak(cfg, {
      ...data,
      currentStreak: 0,
      currentStreakStart: null,
      longestStreak: 0,
      longestStreakStart: null,
      longestStreakEnd: null,
    });
    expect(svg.includes('—')).toBe(true);
  });

  it('escapes a malicious title', () => {
    const cfg = StreakConfig.parse({
      type: 'streak',
      theme: 'github_dark',
      title: '<img src=x onerror=alert(1)>',
    });
    const svg = renderStreak(cfg, data);
    expect(svg.includes('<img')).toBe(false);
    expect(svg.includes('&lt;img')).toBe(true);
  });
});
