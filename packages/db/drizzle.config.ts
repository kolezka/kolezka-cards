import { defineConfig } from 'drizzle-kit';

const url =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/kolezka_cards';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: { url },
  verbose: true,
  strict: true,
});
