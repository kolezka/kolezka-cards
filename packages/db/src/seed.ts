import { loadEnv, resolveDatabaseUrl } from '@kc/shared/env';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createClient } from './client';
import { runStartupMigrations } from './run-migrations';
import { cards, users } from './schema';

const env = loadEnv();
const databaseUrl = resolveDatabaseUrl(env);
await runStartupMigrations(databaseUrl);
const { db, sql: client } = createClient(databaseUrl);

async function upsertUser(githubId: number, login: string): Promise<string> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.githubId, githubId));
  if (existing.length > 0) {
    console.log(`Seed user already exists: ${login} (${existing[0]!.id})`);
    return existing[0]!.id;
  }
  const id = nanoid(16);
  await db.insert(users).values({ id, githubId, login, avatarUrl: null });
  console.log(`Created seed user: ${login} (${id})`);
  return id;
}

async function upsertCard(
  userId: string,
  slug: string,
  type: string,
  theme: string,
  configJson: Record<string, unknown>,
  ownerLogin: string,
): Promise<string> {
  const existingCard = await db
    .select({ id: cards.id })
    .from(cards)
    .where(and(eq(cards.userId, userId), eq(cards.slug, slug)));
  if (existingCard.length > 0) {
    console.log(`Seed card already exists: ${ownerLogin}/${slug} (${existingCard[0]!.id})`);
    return existingCard[0]!.id;
  }
  const id = nanoid(12);
  await db.insert(cards).values({ id, userId, slug, type, theme, configJson });
  console.log(`Created seed card: ${ownerLogin}/${slug} (${id})`);
  return id;
}

// Dev user (no real GitHub identity — used for the visit-counter demo)
const testUserId = await upsertUser(999_001, 'testuser');
await upsertCard(
  testUserId,
  'counter',
  'visit-counter',
  'github_dark',
  {
    type: 'visit-counter',
    theme: 'github_dark',
    title: 'Visits to this card',
    show: { total: true, unique: true },
  },
  'testuser',
);

// Real GitHub user — profile-stats hits the public GitHub API by `users.login`.
const octocatId = await upsertUser(583_231, 'octocat');
await upsertCard(
  octocatId,
  'profile',
  'profile-stats',
  'github_dark',
  { type: 'profile-stats', theme: 'github_dark', show: { languages: true, commitGraph: false } },
  'octocat',
);
await upsertCard(
  octocatId,
  'hello',
  'repo-stats',
  'github_dark',
  { type: 'repo-stats', theme: 'github_dark', repo: 'octocat/Hello-World' },
  'octocat',
);
await upsertCard(
  octocatId,
  'streak',
  'streak',
  'github_dark',
  { type: 'streak', theme: 'github_dark' },
  'octocat',
);
await upsertCard(
  octocatId,
  'summary',
  'profile-summary',
  'github_dark',
  {
    type: 'profile-summary',
    theme: 'github_dark',
    show: { contributions: true, repos: true, joined: true, chart: true },
  },
  'octocat',
);

await client.end({ timeout: 5 });
console.log(`
Try the seeded cards:
  curl -sS 'http://localhost:3001/c/testuser/counter.svg' | head -1
  curl -sS 'http://localhost:3001/c/octocat/profile.svg' | head -1
  curl -sS 'http://localhost:3001/c/octocat/hello.svg' | head -1
  curl -sS 'http://localhost:3001/c/octocat/summary.svg' | head -1
  open  http://localhost:5173/dev
`);
