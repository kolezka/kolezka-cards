import { runStartupMigrations } from './run-migrations';

const databasePath = process.env.DATABASE_PATH ?? './data/app.db';

try {
  const result = runStartupMigrations(databasePath);
  console.log(
    `[migrate] applied=${result.applied} total=${result.total} latest=${result.latestHash ?? 'none'} db=${result.databasePath}`,
  );
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[migrate] FAILED: ${message}`);
  process.exit(1);
}
