import { describe, expect, it } from 'bun:test';
import { CardConfig, VisitCounterConfig } from './card-config';

describe('CardSize on CardBase', () => {
  it('accepts width and height within bounds on every card type', () => {
    const cases = [
      { type: 'visit-counter' as const },
      { type: 'profile-stats' as const },
      { type: 'repo-stats' as const, repo: 'octocat/Hello-World' },
      { type: 'streak' as const },
      { type: 'profile-summary' as const },
    ];
    for (const c of cases) {
      const parsed = CardConfig.parse({ ...c, size: { width: 600, height: 200 } });
      expect(parsed.size).toEqual({ width: 600, height: 200 });
    }
  });

  it('rejects width below 200', () => {
    const result = VisitCounterConfig.safeParse({
      type: 'visit-counter',
      size: { width: 100 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects width above 1200', () => {
    const result = VisitCounterConfig.safeParse({
      type: 'visit-counter',
      size: { width: 2000 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects height below 80', () => {
    const result = VisitCounterConfig.safeParse({
      type: 'visit-counter',
      size: { height: 40 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects height above 600', () => {
    const result = VisitCounterConfig.safeParse({
      type: 'visit-counter',
      size: { height: 800 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer width', () => {
    const result = VisitCounterConfig.safeParse({
      type: 'visit-counter',
      size: { width: 400.5 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown size keys (strict)', () => {
    const result = VisitCounterConfig.safeParse({
      type: 'visit-counter',
      size: { width: 400, depth: 10 },
    });
    expect(result.success).toBe(false);
  });

  it('treats size as optional', () => {
    const parsed = VisitCounterConfig.parse({ type: 'visit-counter' });
    expect(parsed.size).toBeUndefined();
  });
});
