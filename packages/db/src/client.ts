import { type PostgresJsDatabase, drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type DB = PostgresJsDatabase<typeof schema>;
export type DbClient = postgres.Sql;

let cached: { db: DB; sql: DbClient; url: string } | null = null;

/**
 * Build a fresh connection to the Postgres instance at `databaseUrl`.
 * Caller owns the returned `sql` and must close it (used for tests + the
 * migration script). For app-lifetime connections use {@link getClient}.
 */
export function createClient(databaseUrl: string): { db: DB; sql: DbClient } {
  const sql = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: false,
    onnotice: () => {
      // Silence "NOTICE: relation already exists" style chatter; errors still surface.
    },
  });
  const db = drizzle(sql, { schema });
  return { db, sql };
}

/**
 * Process-wide pool. Reused as long as the URL doesn't change. The API
 * server only ever uses one connection string, so this is effectively a
 * singleton in production.
 */
export function getClient(databaseUrl: string): { db: DB; sql: DbClient } {
  if (cached && cached.url === databaseUrl) return { db: cached.db, sql: cached.sql };
  const created = createClient(databaseUrl);
  cached = { ...created, url: databaseUrl };
  return created;
}

export { schema };
