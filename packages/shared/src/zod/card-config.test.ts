import { describe, expect, it } from 'bun:test';
import { CardConfig, ProfileSummaryConfig, VisitCounterConfig } from './card-config';

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

describe('ProfileSummaryConfig period', () => {
  it('accepts preset names', () => {
    for (const preset of ['1m', '3m', '6m', '1y', '2y', 'all'] as const) {
      const cfg = ProfileSummaryConfig.parse({ type: 'profile-summary', period: preset });
      expect(cfg.period).toBe(preset);
    }
  });

  it('accepts a custom {days} object', () => {
    const cfg = ProfileSummaryConfig.parse({
      type: 'profile-summary',
      period: { days: 45 },
    });
    expect(cfg.period).toEqual({ days: 45 });
  });

  it("defaults to '1y' when omitted", () => {
    const cfg = ProfileSummaryConfig.parse({ type: 'profile-summary' });
    expect(cfg.period).toBe('1y');
  });

  it('rejects unknown preset names', () => {
    const result = ProfileSummaryConfig.safeParse({
      type: 'profile-summary',
      period: '5y',
    });
    expect(result.success).toBe(false);
  });

  it('rejects {days} below 7', () => {
    const result = ProfileSummaryConfig.safeParse({
      type: 'profile-summary',
      period: { days: 3 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects {days} above 1825', () => {
    const result = ProfileSummaryConfig.safeParse({
      type: 'profile-summary',
      period: { days: 5000 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer {days}', () => {
    const result = ProfileSummaryConfig.safeParse({
      type: 'profile-summary',
      period: { days: 45.5 },
    });
    expect(result.success).toBe(false);
  });
});
