import { resolve } from 'node:path';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { createClient } from './client';

const databasePath = process.env.DATABASE_PATH ?? './data/app.db';
const migrationsFolder = resolve(import.meta.dir, '..', 'migrations');

const { db, sqlite } = createClient(databasePath);
migrate(db, { migrationsFolder });
sqlite.close();
console.log(`Migrations applied: ${databasePath}`);
