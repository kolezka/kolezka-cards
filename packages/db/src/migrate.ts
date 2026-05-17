import { loadEnv, resolveDatabaseUrl } from '@kc/shared/env';
import { runStartupMigrations } from './run-migrations';

try {
  const env = loadEnv();
  const databaseUrl = resolveDatabaseUrl(env);
  const result = await runStartupMigrations(databaseUrl);
  console.log(
    `[migrate] applied=${result.applied} total=${result.total} latest=${result.latestHash ?? 'none'} db=${result.databaseUrl}`,
  );
  process.exit(0);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[migrate] FAILED: ${message}`);
  process.exit(1);
}
