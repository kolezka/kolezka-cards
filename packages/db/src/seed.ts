import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createClient } from './client';
import { cards, users } from './schema';

const databasePath = process.env.DATABASE_PATH ?? './data/app.db';
const { db, sqlite } = createClient(databasePath);

const SEED_USER_GITHUB_ID = 999_001;
const SEED_USER_LOGIN = 'testuser';
const SEED_CARD_SLUG = 'counter';

const existing = db
  .select({ id: users.id })
  .from(users)
  .where(eq(users.githubId, SEED_USER_GITHUB_ID))
  .all();

let userId: string;
if (existing.length > 0) {
  userId = existing[0]!.id;
  console.log(`Seed user already exists: ${SEED_USER_LOGIN} (${userId})`);
} else {
  userId = nanoid(16);
  db.insert(users)
    .values({
      id: userId,
      githubId: SEED_USER_GITHUB_ID,
      login: SEED_USER_LOGIN,
      avatarUrl: null,
    })
    .run();
  console.log(`Created seed user: ${SEED_USER_LOGIN} (${userId})`);
}

const existingCard = db
  .select({ id: cards.id })
  .from(cards)
  .where(and(eq(cards.userId, userId), eq(cards.slug, SEED_CARD_SLUG)))
  .all();

let cardId: string;
if (existingCard.length > 0) {
  cardId = existingCard[0]!.id;
  console.log(`Seed card already exists: ${SEED_USER_LOGIN}/${SEED_CARD_SLUG} (${cardId})`);
} else {
  cardId = nanoid(12);
  db.insert(cards)
    .values({
      id: cardId,
      userId,
      slug: SEED_CARD_SLUG,
      type: 'visit-counter',
      theme: 'github_dark',
      configJson: {
        type: 'visit-counter',
        theme: 'github_dark',
        title: 'Visits to this card',
        show: { total: true, unique: true },
      },
    })
    .run();
  console.log(`Created seed card: ${SEED_USER_LOGIN}/${SEED_CARD_SLUG} (${cardId})`);
}

sqlite.close();
console.log(
  `\nTry it:\n  curl -i 'http://localhost:3001/c/${SEED_USER_LOGIN}/${SEED_CARD_SLUG}.svg'\n  open  http://localhost:5173/dev`,
);
