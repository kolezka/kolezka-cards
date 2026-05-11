import { describe, expect, it } from 'bun:test';
import { computeStreakStats, parseContributionDays } from './github-contributions';

function rect(date: string, level: number, count: number): string {
  return `<rect class="ContributionCalendar-day" data-date="${date}" data-level="${level}" data-count="${count}"></rect>`;
}

describe('parseContributionDays', () => {
  it('extracts data-date / data-level / data-count from the contribution HTML', () => {
    const html = [
      '<svg>',
      rect('2026-05-09', 0, 0),
      rect('2026-05-10', 2, 5),
      rect('2026-05-11', 4, 23),
      '</svg>',
    ].join('');
    const days = parseContributionDays(html);
    expect(days).toEqual([
      { date: '2026-05-09', count: 0, level: 0 },
      { date: '2026-05-10', count: 5, level: 2 },
      { date: '2026-05-11', count: 23, level: 4 },
    ]);
  });

  it('handles the td-based variant of the calendar markup', () => {
    const html = [
      '<table>',
      '<td class="ContributionCalendar-day" data-date="2026-05-10" data-level="1" data-count="2"></td>',
      '<td data-date="2026-05-11" data-level="3" data-count="9"></td>',
      '</table>',
    ].join('');
    const days = parseContributionDays(html);
    expect(days.length).toBe(2);
    expect(days[1]).toEqual({ date: '2026-05-11', count: 9, level: 3 });
  });

  it('defaults data-count to 0 when absent', () => {
    const html = '<rect data-date="2026-05-11" data-level="0"></rect>';
    expect(parseContributionDays(html)).toEqual([{ date: '2026-05-11', count: 0, level: 0 }]);
  });

  it('sorts days ascending by date', () => {
    const html = [
      rect('2026-05-11', 1, 1),
      rect('2026-05-09', 1, 1),
      rect('2026-05-10', 1, 1),
    ].join('');
    const days = parseContributionDays(html);
    expect(days.map((d) => d.date)).toEqual(['2026-05-09', '2026-05-10', '2026-05-11']);
  });
});

describe('computeStreakStats', () => {
  const today = new Date('2026-05-11T12:00:00Z');

  it('returns zeros for empty input', () => {
    const stats = computeStreakStats([], today);
    expect(stats).toEqual({
      totalThisYear: 0,
      currentStreak: 0,
      longestStreak: 0,
      currentStreakStart: null,
      longestStreakStart: null,
      longestStreakEnd: null,
    });
  });

  it('computes current streak ending today', () => {
    const days = [
      { date: '2026-05-08', count: 0, level: 0 },
      { date: '2026-05-09', count: 3, level: 2 },
      { date: '2026-05-10', count: 1, level: 1 },
      { date: '2026-05-11', count: 5, level: 3 },
    ];
    const s = computeStreakStats(days, today);
    expect(s.currentStreak).toBe(3);
    expect(s.currentStreakStart).toBe('2026-05-09');
  });

  it('extends current streak through yesterday if today is empty', () => {
    const days = [
      { date: '2026-05-09', count: 1, level: 1 },
      { date: '2026-05-10', count: 1, level: 1 },
      { date: '2026-05-11', count: 0, level: 0 },
    ];
    const s = computeStreakStats(days, today);
    expect(s.currentStreak).toBe(2);
  });

  it('breaks the streak when yesterday is also empty', () => {
    const days = [
      { date: '2026-05-09', count: 1, level: 1 },
      { date: '2026-05-10', count: 0, level: 0 },
      { date: '2026-05-11', count: 0, level: 0 },
    ];
    const s = computeStreakStats(days, today);
    expect(s.currentStreak).toBe(0);
  });

  it('finds the longest streak even when not current', () => {
    const days = [
      { date: '2026-05-01', count: 1, level: 1 },
      { date: '2026-05-02', count: 1, level: 1 },
      { date: '2026-05-03', count: 1, level: 1 },
      { date: '2026-05-04', count: 1, level: 1 },
      { date: '2026-05-05', count: 0, level: 0 },
      { date: '2026-05-06', count: 0, level: 0 },
      { date: '2026-05-10', count: 1, level: 1 },
      { date: '2026-05-11', count: 1, level: 1 },
    ];
    const s = computeStreakStats(days, today);
    expect(s.longestStreak).toBe(4);
    expect(s.longestStreakStart).toBe('2026-05-01');
    expect(s.longestStreakEnd).toBe('2026-05-04');
    expect(s.currentStreak).toBe(2);
  });

  it('totals contributions in the same calendar year as `today`', () => {
    const days = [
      { date: '2025-12-31', count: 9, level: 4 },
      { date: '2026-01-01', count: 1, level: 1 },
      { date: '2026-05-11', count: 4, level: 2 },
    ];
    const s = computeStreakStats(days, today);
    expect(s.totalThisYear).toBe(5);
  });
});
