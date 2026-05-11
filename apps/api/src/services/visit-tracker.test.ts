import { Database } from 'bun:sqlite';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { dirname } from 'node:path';
import * as schema from '@kc/db/schema';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { nanoid } from 'nanoid';
import { trackVisit } from './visit-tracker';

const TEST_DB = resolve(import.meta.dir, '../../.tmp/visit-tracker.test.db');

let sqlite: Database;
let db: ReturnType<typeof drizzle<typeof schema>>;
let cardId: string;
let userId: string;

beforeAll(() => {
  mkdirSync(dirname(TEST_DB), { recursive: true });
  if (existsSync(TEST_DB)) rmSync(TEST_DB);
  if (existsSync(`${TEST_DB}-shm`)) rmSync(`${TEST_DB}-shm`);
  if (existsSync(`${TEST_DB}-wal`)) rmSync(`${TEST_DB}-wal`);

  sqlite = new Database(TEST_DB, { create: true });
  sqlite.run('PRAGMA journal_mode = WAL;');
  sqlite.run('PRAGMA foreign_keys = ON;');
  db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: resolve(import.meta.dir, '../../../../packages/db/migrations') });

  userId = nanoid(16);
  cardId = nanoid(12);
  db.insert(schema.users).values({ id: userId, githubId: 1, login: 'tester' }).run();
  db.insert(schema.cards)
    .values({
      id: cardId,
      userId,
      slug: 'c',
      type: 'visit-counter',
      configJson: { type: 'visit-counter' },
    })
    .run();
});

afterAll(() => {
  sqlite.close();
});

describe('trackVisit', () => {
  it('marks the first visit as unique and increments both counters', () => {
    const r = trackVisit(db, {
      cardId,
      fingerprintHash: 'fp-a',
      country: 'PL',
      referrerHost: 'github.com',
      userAgentFamily: 'firefox',
    });
    expect(r.wasUnique).toBe(true);
    expect(r.totalImpressions).toBe(1);
    expect(r.uniqueVisits).toBe(1);
  });

  it('counts a repeat fingerprint inside the 12h window as a non-unique impression', () => {
    const r = trackVisit(db, {
      cardId,
      fingerprintHash: 'fp-a',
      country: 'PL',
      referrerHost: 'github.com',
      userAgentFamily: 'firefox',
    });
    expect(r.wasUnique).toBe(false);
    expect(r.totalImpressions).toBe(2);
    expect(r.uniqueVisits).toBe(1);
  });

  it('counts a different fingerprint as a new unique', () => {
    const r = trackVisit(db, {
      cardId,
      fingerprintHash: 'fp-b',
      country: 'DE',
      referrerHost: null,
      userAgentFamily: 'chrome',
    });
    expect(r.wasUnique).toBe(true);
    expect(r.totalImpressions).toBe(3);
    expect(r.uniqueVisits).toBe(2);
  });

  it('treats a visit older than the dedup window as a fresh unique', () => {
    const longAgo = new Date(Date.now() - 13 * 60 * 60 * 1000);
    const r1 = trackVisit(db, {
      cardId,
      fingerprintHash: 'fp-stale',
      country: null,
      referrerHost: null,
      userAgentFamily: null,
      now: longAgo,
    });
    expect(r1.wasUnique).toBe(true);

    const r2 = trackVisit(db, {
      cardId,
      fingerprintHash: 'fp-stale',
      country: null,
      referrerHost: null,
      userAgentFamily: null,
    });
    expect(r2.wasUnique).toBe(true);
  });
});
