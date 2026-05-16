import { describe, expect, it } from 'bun:test';
import { parseQueryOverrides } from './query-overrides';

describe('QueryOverridesSchema w/h coercion', () => {
  it('coerces numeric strings to integers', () => {
    const q = parseQueryOverrides({ w: '600', h: '200' });
    expect(q.w).toBe(600);
    expect(q.h).toBe(200);
  });

  it('drops out-of-range values silently (whole parse falls back to {})', () => {
    const q = parseQueryOverrides({ w: '50' });
    expect(q.w).toBeUndefined();
  });

  it('drops non-numeric values', () => {
    const q = parseQueryOverrides({ w: 'wide' });
    expect(q.w).toBeUndefined();
  });

  it('returns nothing when w/h absent', () => {
    const q = parseQueryOverrides({});
    expect(q.w).toBeUndefined();
    expect(q.h).toBeUndefined();
  });

  it('preserves other overrides alongside w/h', () => {
    const q = parseQueryOverrides({ w: '400', theme: 'github_dark', accent: '#abcdef' });
    expect(q.w).toBe(400);
    expect(q.theme).toBe('github_dark');
    expect(q.accent).toBe('#abcdef');
  });
});

describe('QueryOverridesSchema period/days', () => {
  it('accepts preset period names', () => {
    for (const preset of ['1m', '3m', '6m', '1y', '2y', 'all'] as const) {
      const q = parseQueryOverrides({ period: preset });
      expect(q.period).toBe(preset);
    }
  });

  it('drops unknown period names', () => {
    const q = parseQueryOverrides({ period: '99y' });
    expect(q.period).toBeUndefined();
  });

  it('coerces days from string', () => {
    const q = parseQueryOverrides({ days: '45' });
    expect(q.days).toBe(45);
  });

  it('drops out-of-range days', () => {
    const q = parseQueryOverrides({ days: '3' });
    expect(q.days).toBeUndefined();
  });
});
