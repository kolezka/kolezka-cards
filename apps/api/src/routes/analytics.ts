import { type DB, schema } from '@kc/db';
import type { Env } from '@kc/shared/env';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { type SessionContext, requireSession } from '../middleware/session';
import { parseRange, queryAnalytics } from '../services/analytics';

export function createAnalyticsRoute(db: DB, env: Env): Hono<SessionContext> {
  const app = new Hono<SessionContext>();
  app.use('/api/cards/:id/analytics', requireSession(db, env));

  app.get('/api/cards/:id/analytics', async (c) => {
    const cardId = c.req.param('id');
    const user = c.get('user');
    const card = (
      await db
        .select()
        .from(schema.cards)
        .where(and(eq(schema.cards.id, cardId), eq(schema.cards.userId, user.id)))
        .limit(1)
    )[0];
    if (!card) return c.json({ error: 'not_found' }, 404);

    const range = parseRange(c.req.query('range'));
    const result = await queryAnalytics(db, { cardId, range });
    return c.json(result);
  });

  return app;
}
