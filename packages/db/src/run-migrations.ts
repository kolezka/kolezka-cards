import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { createClient } from './client';

export interface MigrationResult {
  /** Number of new migrations applied during this call (0 if DB was already current). */
  applied: number;
  /** Total migrations now recorded in `__drizzle_migrations`. */
  total: number;
  /** Hash of the most-recently-applied migration, or `null` for an empty migrations folder. */
  latestHash: string | null;
  /** Absolute database file path that was migrated. */
  databasePath: string;
}

export interface RunMigrationsOptions {
  migrationsFolder?: string;
}

const DEFAULT_MIGRATIONS_FOLDER = resolve(import.meta.dir, '..', 'migrations');

/**
 * Apply Drizzle migrations to the SQLite database at `databasePath` using a
 * private short-lived connection, then close it. Returns a structured result
 * so callers (the API boot path, CLI script, tests) can log + verify outcome.
 *
 * Throws a descriptive Error on failure; never swallows.
 */
export function runStartupMigrations(
  databasePath: string,
  options: RunMigrationsOptions = {},
): MigrationResult {
  const migrationsFolder = options.migrationsFolder ?? DEFAULT_MIGRATIONS_FOLDER;

  if (!existsSync(migrationsFolder)) {
    throw new Error(
      `migrations folder not found at ${migrationsFolder} — Drizzle has nothing to apply`,
    );
  }

  const { db, sqlite } = createClient(databasePath);

  try {
    const beforeTotal = countAppliedMigrations(sqlite);
    migrate(db, { migrationsFolder });
    const afterTotal = countAppliedMigrations(sqlite);
    const latestHash = readLatestMigrationHash(sqlite);
    return {
      applied: afterTotal - beforeTotal,
      total: afterTotal,
      latestHash,
      databasePath,
    };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`migration failed for ${databasePath}: ${message}`, { cause });
  } finally {
    sqlite.close();
  }
}

function countAppliedMigrations(sqlite: ReturnType<typeof createClient>['sqlite']): number {
  if (!hasMigrationsTable(sqlite)) return 0;
  const row = sqlite
    .query<{ n: number }, []>('SELECT COUNT(*) AS n FROM __drizzle_migrations')
    .get();
  return row?.n ?? 0;
}

function readLatestMigrationHash(sqlite: ReturnType<typeof createClient>['sqlite']): string | null {
  if (!hasMigrationsTable(sqlite)) return null;
  const row = sqlite
    .query<{ hash: string }, []>('SELECT hash FROM __drizzle_migrations ORDER BY id DESC LIMIT 1')
    .get();
  return row?.hash ?? null;
}

function hasMigrationsTable(sqlite: ReturnType<typeof createClient>['sqlite']): boolean {
  const row = sqlite
    .query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'",
    )
    .get();
  return Boolean(row);
}
