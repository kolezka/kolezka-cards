import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

const MIGRATIONS_FOLDER = resolve(import.meta.dir, '..', 'migrations');

let pg: PGlite;
let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
  pg = new PGlite();
  db = drizzle(pg);
});

afterAll(async () => {
  await pg.close();
});

describe('migrations', () => {
  it('apply cleanly on a fresh database and create the expected tables', async () => {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

    const result = (await db.execute(
      sql`SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public'
          ORDER BY table_name`,
    )) as unknown as { rows: Array<{ table_name: string }> } | Array<{ table_name: string }>;
    const rows: Array<{ table_name: string }> = Array.isArray(result) ? result : result.rows;
    const tables = rows.map((r) => r.table_name).sort();
    expect(tables).toEqual(
      [
        'cards',
        'impression_buckets',
        'oauth_state',
        'sessions',
        'users',
        'users_followers_history',
        'visits',
      ].sort(),
    );
  });

  it('are idempotent — re-running applies no further changes', async () => {
    // Should not throw on second invocation.
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  });
});
