import { describe, expect, it } from 'bun:test';
import { type Env, isAdminLogin, parseAdminLogins } from './env';

const baseEnv: Env = {
  APP_SECRET: 'x'.repeat(32),
  BASE_URL: 'https://example.com',
  DATABASE_PATH: ':memory:',
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
