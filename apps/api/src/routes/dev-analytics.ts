import { type DB, schema } from '@kc/db';
import { eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';

export function createDevAnalyticsRoute(db: DB): Hono {
  const app = new Hono();

  app.get('/api/_dev/cards', async (c) => {
    const rows = await db
      .select({
        id: schema.cards.id,
        userLogin: schema.users.login,
        slug: schema.cards.slug,
        type: schema.cards.type,
      })
      .from(schema.cards)
      .innerJoin(schema.users, eq(schema.cards.userId, schema.users.id));
    return c.json(rows);
  });

  app.get('/api/_dev/cards/:id', async (c) => {
    const id = c.req.param('id');
    const card = (await db.select().from(schema.cards).where(eq(schema.cards.id, id)).limit(1))[0];
    if (!card) return c.json({ error: 'not_found' }, 404);

    const totals = (
      await db
        .select({
          totalImpressions: sql<number>`COALESCE(SUM(${schema.impressionBuckets.totalImpressions}), 0)`,
          uniqueVisits: sql<number>`COALESCE(SUM(${schema.impressionBuckets.uniqueVisits}), 0)`,
        })
        .from(schema.impressionBuckets)
        .where(eq(schema.impressionBuckets.cardId, id))
    )[0];

    return c.json({
      card,
      totals: {
        totalImpressions: Number(totals?.totalImpressions ?? 0),
        uniqueVisits: Number(totals?.uniqueVisits ?? 0),
      },
    });
  });

  return app;
}
