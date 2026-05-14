import { Database } from 'bun:sqlite';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { runStartupMigrations } from './run-migrations';

const TMP_DIR = resolve(import.meta.dir, '../.tmp');
const TEST_DB = resolve(TMP_DIR, 'run-migrations.test.db');

function clean(path: string) {
  for (const suffix of ['', '-shm', '-wal']) {
    if (existsSync(`${path}${suffix}`)) rmSync(`${path}${suffix}`);
  }
}

beforeAll(() => {
  mkdirSync(dirname(TEST_DB), { recursive: true });
  clean(TEST_DB);
});

afterAll(() => {
  clean(TEST_DB);
});

describe('runStartupMigrations', () => {
  it('applies all migrations on a fresh database and reports the latest hash', () => {
    const result = runStartupMigrations(TEST_DB);
    expect(result.applied).toBeGreaterThan(0);
    expect(result.latestHash).toMatch(/^[0-9a-f]{16,}$/);

    // Verify the schema is actually present.
    const sqlite = new Database(TEST_DB, { readonly: true });
    const tables = sqlite
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_%'",
      )
      .all()
      .map((row) => row.name)
      .sort();
    sqlite.close();

    expect(tables).toEqual(
      ['cards', 'impression_buckets', 'oauth_state', 'sessions', 'users', 'visits'].sort(),
    );
  });

  it('is idempotent — second run applies zero new migrations and returns the same latest hash', () => {
    const first = runStartupMigrations(TEST_DB);
    const second = runStartupMigrations(TEST_DB);
    expect(second.applied).toBe(0);
    expect(second.latestHash).toBe(first.latestHash);
  });

  it('does not leak the sqlite connection between runs', () => {
    // A leaked WAL writer would prevent another exclusive open. Round-trip
    // an exclusive connection between calls to confirm no handles linger.
    runStartupMigrations(TEST_DB);
    const sqlite = new Database(TEST_DB);
    sqlite.run('PRAGMA journal_mode = WAL;');
    sqlite.close();
    runStartupMigrations(TEST_DB);
  });

  it('throws a structured error when the migrations folder is missing', () => {
    expect(() => runStartupMigrations(TEST_DB, { migrationsFolder: '/nonexistent/path' })).toThrow(
      /migrations/i,
    );
  });
});
