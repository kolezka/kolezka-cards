import { describe, expect, it } from 'bun:test';
import { computeDailySalt, computeFingerprint, utcDateKey } from './fingerprint';

const SECRET = 'test_secret_'.padEnd(32, 'x');

describe('utcDateKey', () => {
  it('returns YYYY-MM-DD for a UTC date', () => {
    expect(utcDateKey(new Date('2026-05-11T12:34:56Z'))).toBe('2026-05-11');
  });

  it('uses UTC even when local timezone differs', () => {
    expect(utcDateKey(new Date('2026-05-11T23:59:59Z'))).toBe('2026-05-11');
    expect(utcDateKey(new Date('2026-05-12T00:00:00Z'))).toBe('2026-05-12');
  });
});

describe('computeDailySalt', () => {
  it('is deterministic for the same secret + date', () => {
    const a = computeDailySalt(SECRET, new Date('2026-05-11T12:00:00Z'));
    const b = computeDailySalt(SECRET, new Date('2026-05-11T18:00:00Z'));
    expect(a).toBe(b);
  });

  it('rotates at UTC midnight', () => {
    const before = computeDailySalt(SECRET, new Date('2026-05-11T23:59:59Z'));
    const after = computeDailySalt(SECRET, new Date('2026-05-12T00:00:00Z'));
    expect(before).not.toBe(after);
  });

  it('differs with a different secret', () => {
    const a = computeDailySalt(SECRET, new Date('2026-05-11T12:00:00Z'));
    const b = computeDailySalt(`${SECRET}!`, new Date('2026-05-11T12:00:00Z'));
    expect(a).not.toBe(b);
  });
});

describe('computeFingerprint', () => {
  const headers = {
    userAgent: 'Mozilla/5.0',
    acceptLanguage: 'en-US,en;q=0.9',
    acceptEncoding: 'gzip, br',
  };

  it('produces a 64-char hex sha256', () => {
    const fp = computeFingerprint(headers, SECRET, new Date('2026-05-11T12:00:00Z'));
    expect(fp).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is stable for identical inputs on the same UTC day', () => {
    const a = computeFingerprint(headers, SECRET, new Date('2026-05-11T09:00:00Z'));
    const b = computeFingerprint(headers, SECRET, new Date('2026-05-11T22:00:00Z'));
    expect(a).toBe(b);
  });

  it('changes when User-Agent changes', () => {
    const a = computeFingerprint(headers, SECRET, new Date('2026-05-11T12:00:00Z'));
    const b = computeFingerprint(
      { ...headers, userAgent: 'curl/8.0' },
      SECRET,
      new Date('2026-05-11T12:00:00Z'),
    );
    expect(a).not.toBe(b);
  });

  it('changes when daily salt rotates', () => {
    const a = computeFingerprint(headers, SECRET, new Date('2026-05-11T23:59:59Z'));
    const b = computeFingerprint(headers, SECRET, new Date('2026-05-12T00:00:00Z'));
    expect(a).not.toBe(b);
  });

  it('normalizes missing headers to empty strings', () => {
    const a = computeFingerprint(
      { userAgent: '', acceptLanguage: '', acceptEncoding: '' },
      SECRET,
      new Date('2026-05-11T12:00:00Z'),
    );
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
