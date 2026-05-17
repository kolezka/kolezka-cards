import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { DB } from './client';
import * as schema from './schema';

const MIGRATIONS_FOLDER = resolve(import.meta.dir, '..', 'migrations');

/**
 * Tests use `DB` rather than PgliteDatabase so service signatures match
 * production. Runtime query methods are identical between the two
 * adapters for our usage; the `as DB` cast bridges the structural
 * differences (e.g. PgliteDatabase doesn't expose every postgres-js
 * helper, none of which we call from tests).
 */
export type TestDB = DB;

/**
 * Spin up an in-memory PGlite database for a test file, apply all
 * Drizzle migrations against it, and return the drizzle handle plus a
 * `close()` to call from `afterAll`.
 *
 * Each call returns a fresh, isolated instance — there's no shared state
 * between test files. Tests can `beforeEach(() => db.delete(...))` for
 * within-file isolation as needed.
 */
export async function createTestDb(): Promise<{ db: TestDB; close: () => Promise<void> }> {
  const pg = new PGlite();
  const drizzleDb = drizzle(pg, { schema });
  await migrate(drizzleDb, { migrationsFolder: MIGRATIONS_FOLDER });
  return {
    db: drizzleDb as unknown as TestDB,
    close: async () => {
      await pg.close();
    },
  };
}
