import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { type BunSQLiteDatabase, drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';

export type DB = BunSQLiteDatabase<typeof schema>;

let cached: { db: DB; sqlite: Database; path: string } | null = null;

const PRAGMAS = [
  'PRAGMA journal_mode = WAL;',
  'PRAGMA busy_timeout = 5000;',
  'PRAGMA foreign_keys = ON;',
  'PRAGMA synchronous = NORMAL;',
];

export function createClient(databasePath: string): { db: DB; sqlite: Database } {
  const absolute = isAbsolute(databasePath) ? databasePath : resolve(process.cwd(), databasePath);
  mkdirSync(dirname(absolute), { recursive: true });
  const sqlite = new Database(absolute, { create: true });
  for (const stmt of PRAGMAS) {
    sqlite.run(stmt);
  }
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

export function getClient(databasePath: string): { db: DB; sqlite: Database } {
  if (cached && cached.path === databasePath) return { db: cached.db, sqlite: cached.sqlite };
  const created = createClient(databasePath);
  cached = { ...created, path: databasePath };
  return created;
}

export { schema };
