import { describe, expect, it } from 'bun:test';
import { type Env, getEnvWarnings, isAdminLogin, parseAdminLogins } from './env';

const baseEnv: Env = {
  APP_SECRET: 'x'.repeat(32),
  BASE_URL: 'https://example.com',
  NODE_ENV: 'test',
};

describe('parseAdminLogins', () => {
  it('returns an empty set when unset/empty/whitespace', () => {
    expect(parseAdminLogins(undefined).size).toBe(0);
    expect(parseAdminLogins(null).size).toBe(0);
    expect(parseAdminLogins('').size).toBe(0);
    expect(parseAdminLogins('   ').size).toBe(0);
    expect(parseAdminLogins(',, ,').size).toBe(0);
  });

  it('splits on commas, trims, and lowercases', () => {
    const s = parseAdminLogins(' Kolezka , RaQz, kolezka ');
    expect(s.has('kolezka')).toBe(true);
    expect(s.has('raqz')).toBe(true);
    expect(s.size).toBe(2);
  });
});

describe('isAdminLogin', () => {
  it('returns false for unknown / empty inputs', () => {
    const env = { ...baseEnv, ADMIN_LOGINS: 'kolezka,raqz' };
    expect(isAdminLogin(env, undefined)).toBe(false);
    expect(isAdminLogin(env, '')).toBe(false);
    expect(isAdminLogin(env, 'someone-else')).toBe(false);
  });

  it('matches case-insensitively', () => {
    const env = { ...baseEnv, ADMIN_LOGINS: 'kolezka,raqz' };
    expect(isAdminLogin(env, 'kolezka')).toBe(true);
    expect(isAdminLogin(env, 'KOLEZKA')).toBe(true);
    expect(isAdminLogin(env, 'Raqz')).toBe(true);
  });

  it('returns false when ADMIN_LOGINS is unset', () => {
    expect(isAdminLogin(baseEnv, 'kolezka')).toBe(false);
  });
});

describe('getEnvWarnings', () => {
  const prodHttps: Env = {
    ...baseEnv,
    NODE_ENV: 'production',
    BASE_URL: 'https://cards.example.com',
  };

  it('returns no warnings for an https production BASE_URL on a public host', () => {
    expect(getEnvWarnings(prodHttps)).toEqual([]);
  });

  it('returns no warnings outside production, even for a dev-looking BASE_URL', () => {
    expect(getEnvWarnings({ ...baseEnv, BASE_URL: 'http://localhost:3001' })).toEqual([]);
  });

  it('warns when production BASE_URL is not https', () => {
    const warnings = getEnvWarnings({ ...prodHttps, BASE_URL: 'http://cards.example.com' });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.field).toBe('BASE_URL');
    expect(warnings[0]?.message).toContain('http:');
  });

  it('warns when production BASE_URL points at loopback', () => {
    const warnings = getEnvWarnings({ ...prodHttps, BASE_URL: 'http://localhost:3000' });
    // Two warnings: not-https AND loopback.
    expect(warnings).toHaveLength(2);
    expect(warnings.map((w) => w.message).some((m) => m.includes('loopback'))).toBe(true);
  });

  it('warns for the 127.0.0.1 loopback variant', () => {
    const warnings = getEnvWarnings({ ...prodHttps, BASE_URL: 'https://127.0.0.1' });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.message).toContain('loopback');
  });
});
