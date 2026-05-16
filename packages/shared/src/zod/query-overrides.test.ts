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
