import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createClient } from './client';
import { cards, users } from './schema';

const databasePath = process.env.DATABASE_PATH ?? './data/app.db';
const { db, sqlite } = createClient(databasePath);

function upsertUser(githubId: number, login: string): string {
  const existing = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.githubId, githubId))
    .all();
  if (existing.length > 0) {
    console.log(`Seed user already exists: ${login} (${existing[0]!.id})`);
    return existing[0]!.id;
  }
  const id = nanoid(16);
  db.insert(users).values({ id, githubId, login, avatarUrl: null }).run();
  console.log(`Created seed user: ${login} (${id})`);
  return id;
}

function upsertCard(
  userId: string,
  slug: string,
  type: string,
  theme: string,
  configJson: Record<string, unknown>,
  ownerLogin: string,
): string {
  const existingCard = db
    .select({ id: cards.id })
    .from(cards)
    .where(and(eq(cards.userId, userId), eq(cards.slug, slug)))
    .all();
  if (existingCard.length > 0) {
    console.log(`Seed card already exists: ${ownerLogin}/${slug} (${existingCard[0]!.id})`);
    return existingCard[0]!.id;
  }
  const id = nanoid(12);
  db.insert(cards).values({ id, userId, slug, type, theme, configJson }).run();
  console.log(`Created seed card: ${ownerLogin}/${slug} (${id})`);
  return id;
}

// Dev user (no real GitHub identity — used for the visit-counter demo)
const testUserId = upsertUser(999_001, 'testuser');
upsertCard(
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
const octocatId = upsertUser(583_231, 'octocat');
upsertCard(
  octocatId,
  'profile',
  'profile-stats',
  'github_dark',
  { type: 'profile-stats', theme: 'github_dark', show: { languages: true, commitGraph: false } },
  'octocat',
);
upsertCard(
  octocatId,
  'hello',
  'repo-stats',
  'github_dark',
  { type: 'repo-stats', theme: 'github_dark', repo: 'octocat/Hello-World' },
  'octocat',
);
upsertCard(
  octocatId,
  'streak',
  'streak',
  'github_dark',
  { type: 'streak', theme: 'github_dark' },
  'octocat',
);
upsertCard(
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

sqlite.close();
console.log(`
Try the seeded cards:
  curl -sS 'http://localhost:3001/c/testuser/counter.svg' | head -1
  curl -sS 'http://localhost:3001/c/octocat/profile.svg' | head -1
  curl -sS 'http://localhost:3001/c/octocat/hello.svg' | head -1
  curl -sS 'http://localhost:3001/c/octocat/summary.svg' | head -1
  open  http://localhost:5173/dev
`);
