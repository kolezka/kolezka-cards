import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createClient } from './client';

export interface MigrationResult {
  /** Number of new migrations applied during this call (0 if DB was already current). */
  applied: number;
  /** Total migrations now recorded in `drizzle.__drizzle_migrations`. */
  total: number;
  /** Hash of the most-recently-applied migration, or `null` for an empty migrations folder. */
  latestHash: string | null;
  /** Database URL that was migrated (with any password masked). */
  databaseUrl: string;
}

export interface RunMigrationsOptions {
  migrationsFolder?: string;
}

const DEFAULT_MIGRATIONS_FOLDER = resolve(import.meta.dir, '..', 'migrations');

/**
 * Apply Drizzle migrations to the Postgres database at `databaseUrl` using
 * a private short-lived connection, then close it. Returns a structured
 * result so callers (the API boot path, CLI script, tests) can log + verify
 * outcome.
 *
 * Throws a descriptive Error on failure; never swallows.
 */
export async function runStartupMigrations(
  databaseUrl: string,
  options: RunMigrationsOptions = {},
): Promise<MigrationResult> {
  const migrationsFolder = options.migrationsFolder ?? DEFAULT_MIGRATIONS_FOLDER;

  if (!existsSync(migrationsFolder)) {
    throw new Error(
      `migrations folder not found at ${migrationsFolder} — Drizzle has nothing to apply`,
    );
  }

  const { db, sql: client } = createClient(databaseUrl);

  try {
    const beforeTotal = await countAppliedMigrations(db);
    await migrate(db, { migrationsFolder });
    const afterTotal = await countAppliedMigrations(db);
    const latestHash = await readLatestMigrationHash(db);
    return {
      applied: afterTotal - beforeTotal,
      total: afterTotal,
      latestHash,
      databaseUrl: maskDatabaseUrl(databaseUrl),
    };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`migration failed for ${maskDatabaseUrl(databaseUrl)}: ${message}`, {
      cause,
    });
  } finally {
    await client.end({ timeout: 5 });
  }
}

async function countAppliedMigrations(db: ReturnType<typeof createClient>['db']): Promise<number> {
  // Drizzle's postgres-js migrator stores its journal in the `drizzle`
  // schema. Before the first migration applies the table doesn't exist;
  // information_schema lets us check that safely.
  const exists = await db.execute(sql`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
  `);
  if (exists.length === 0) return 0;
  const rows = await db.execute<{ n: string }>(
    sql`SELECT COUNT(*)::text AS n FROM drizzle.__drizzle_migrations`,
  );
  return Number(rows[0]?.n ?? 0);
}

async function readLatestMigrationHash(
  db: ReturnType<typeof createClient>['db'],
): Promise<string | null> {
  const exists = await db.execute(sql`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
  `);
  if (exists.length === 0) return null;
  const rows = await db.execute<{ hash: string }>(
    sql`SELECT hash FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 1`,
  );
  return rows[0]?.hash ?? null;
}

function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return url;
  }
}
