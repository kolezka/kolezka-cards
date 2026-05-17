import { describe, expect, it } from 'bun:test';
import {
  computeDailySalt,
  computeFingerprint,
  detectCamo,
  normalizeHeaderValue,
  truncateIp,
  utcDateKey,
} from './fingerprint';

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

describe('normalizeHeaderValue', () => {
  it('lowercases, trims, and collapses whitespace', () => {
    expect(normalizeHeaderValue('  Mozilla/5.0   Chrome ')).toBe('mozilla/5.0 chrome');
  });
  it('treats null/undefined/empty the same', () => {
    expect(normalizeHeaderValue(undefined)).toBe('');
    expect(normalizeHeaderValue(null)).toBe('');
    expect(normalizeHeaderValue('')).toBe('');
  });
});

describe('truncateIp', () => {
  it('returns empty for empty/invalid input', () => {
    expect(truncateIp('')).toBe('');
    expect(truncateIp(undefined)).toBe('');
    expect(truncateIp(null)).toBe('');
    expect(truncateIp('not-an-ip')).toBe('');
    expect(truncateIp('   ')).toBe('');
  });

  it('truncates IPv4 to /24', () => {
    expect(truncateIp('203.0.113.42')).toBe('203.0.113.0/24');
    expect(truncateIp('203.0.113.0')).toBe('203.0.113.0/24');
    expect(truncateIp('1.2.3.4')).toBe('1.2.3.0/24');
  });

  it('rejects IPv4 with out-of-range octets', () => {
    expect(truncateIp('999.0.0.1')).toBe('');
    expect(truncateIp('1.2.3.256')).toBe('');
  });

  it('truncates IPv6 to /64 (full form)', () => {
    expect(truncateIp('2001:db8:abcd:1234:5678:9abc:def0:1')).toBe('2001:db8:abcd:1234::/64');
  });

  it('truncates IPv6 with :: compression', () => {
    expect(truncateIp('2001:db8::1')).toBe('2001:db8:0:0::/64');
    expect(truncateIp('::1')).toBe('0:0:0:0::/64');
    expect(truncateIp('fe80::abcd:1234:5678:9abc')).toBe('fe80:0:0:0::/64');
  });

  it('treats IPv4-mapped IPv6 as IPv4', () => {
    expect(truncateIp('::ffff:203.0.113.42')).toBe('203.0.113.0/24');
    expect(truncateIp('::FFFF:1.2.3.4')).toBe('1.2.3.0/24');
  });

  it('strips leading zeros in canonical IPv6 output', () => {
    expect(truncateIp('2001:0db8:0000:0000:0:0:0:0')).toBe('2001:db8:0:0::/64');
  });

  it('rejects malformed IPv6', () => {
    expect(truncateIp('2001:db8:::1')).toBe('');
    expect(truncateIp('gggg::1')).toBe('');
    expect(truncateIp('1:2:3')).toBe('');
  });
});

describe('detectCamo', () => {
  it('detects github-camo User-Agent', () => {
    expect(detectCamo({ userAgent: 'github-camo/abc123' })).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(detectCamo({ userAgent: 'GitHub-Camo/ABC123' })).toBe(true);
  });

  it('detects camo in Via header', () => {
    expect(detectCamo({ userAgent: '', via: '1.1 camo-proxy' })).toBe(true);
  });

  it('returns false for normal browsers', () => {
    expect(detectCamo({ userAgent: 'Mozilla/5.0 Chrome/120' })).toBe(false);
  });

  it('returns false when both are empty/missing', () => {
    expect(detectCamo({})).toBe(false);
    expect(detectCamo({ userAgent: null, via: null })).toBe(false);
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

  it('changes when ipPrefix changes', () => {
    const day = new Date('2026-05-11T12:00:00Z');
    const a = computeFingerprint({ ...headers, ipPrefix: '203.0.113.0/24' }, SECRET, day);
    const b = computeFingerprint({ ...headers, ipPrefix: '203.0.114.0/24' }, SECRET, day);
    expect(a).not.toBe(b);
  });

  it('treats omitted ipPrefix as empty string (Camo equivalence)', () => {
    const day = new Date('2026-05-11T12:00:00Z');
    const a = computeFingerprint(headers, SECRET, day);
    const b = computeFingerprint({ ...headers, ipPrefix: '' }, SECRET, day);
    expect(a).toBe(b);
  });

  it('changes when any new client-hint changes', () => {
    const day = new Date('2026-05-11T12:00:00Z');
    const baseline = computeFingerprint(headers, SECRET, day);
    for (const field of ['secChUaArch', 'secChUaBitness', 'secChUaModel'] as const) {
      const variant = computeFingerprint({ ...headers, [field]: 'x' }, SECRET, day);
      expect(variant).not.toBe(baseline);
    }
  });

  it('changes when country changes', () => {
    const day = new Date('2026-05-11T12:00:00Z');
    const a = computeFingerprint({ ...headers, country: 'PL' }, SECRET, day);
    const b = computeFingerprint({ ...headers, country: 'DE' }, SECRET, day);
    expect(a).not.toBe(b);
  });
});
