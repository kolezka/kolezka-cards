import { type DB, schema } from '@kc/db';
import type { Env } from '@kc/shared/env';
import { desc, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { requireAdmin } from '../middleware/admin';
import { type SessionContext, requireSession } from '../middleware/session';

export function createAdminRoute(db: DB, env: Env): Hono<SessionContext> {
  const app = new Hono<SessionContext>();

  app.use('/api/admin/*', requireSession(db, env));
  app.use('/api/admin/*', requireAdmin(env));

  app.get('/api/admin/users', (c) => {
    const rows = db
      .select({
        id: schema.users.id,
        githubId: schema.users.githubId,
        login: schema.users.login,
        avatarUrl: schema.users.avatarUrl,
        createdAt: schema.users.createdAt,
        cardCount: sql<number>`count(${schema.cards.id})`.as('card_count'),
      })
      .from(schema.users)
      .leftJoin(schema.cards, eq(schema.cards.userId, schema.users.id))
      .groupBy(schema.users.id)
      .orderBy(desc(schema.users.createdAt))
      .all();
    return c.json(
      rows.map((r) => ({
        id: r.id,
        githubId: r.githubId,
        login: r.login,
        avatarUrl: r.avatarUrl,
        createdAt: r.createdAt,
        cardCount: Number(r.cardCount),
      })),
    );
  });

  app.get('/api/admin/users/:userId/cards', (c) => {
    const userId = c.req.param('userId');
    const user = db
      .select({ login: schema.users.login })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .get();
    if (!user) return c.json({ error: 'not_found' }, 404);

    const rows = db
      .select({
        id: schema.cards.id,
        slug: schema.cards.slug,
        type: schema.cards.type,
        theme: schema.cards.theme,
        createdAt: schema.cards.createdAt,
        updatedAt: schema.cards.updatedAt,
        totalImpressions: sql<number>`COALESCE((
          SELECT SUM(${schema.impressionBuckets.totalImpressions})
          FROM ${schema.impressionBuckets}
          WHERE ${schema.impressionBuckets.cardId} = ${schema.cards.id}
        ), 0)`.as('total_impressions'),
        uniqueVisits: sql<number>`COALESCE((
          SELECT SUM(${schema.impressionBuckets.uniqueVisits})
          FROM ${schema.impressionBuckets}
          WHERE ${schema.impressionBuckets.cardId} = ${schema.cards.id}
        ), 0)`.as('unique_visits'),
      })
      .from(schema.cards)
      .where(eq(schema.cards.userId, userId))
      .orderBy(desc(schema.cards.createdAt))
      .all();

    return c.json({
      user: { id: userId, login: user.login },
      cards: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        type: r.type,
        theme: r.theme,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        ownerLogin: user.login,
        url: `/c/${user.login}/${r.slug}.svg`,
        totalImpressions: Number(r.totalImpressions),
        uniqueVisits: Number(r.uniqueVisits),
      })),
    });
  });

  app.delete('/api/admin/cards/:cardId', (c) => {
    const id = c.req.param('cardId');
    const existing = db
      .select({ id: schema.cards.id })
      .from(schema.cards)
      .where(eq(schema.cards.id, id))
      .get();
    if (!existing) return c.json({ error: 'not_found' }, 404);
    db.delete(schema.cards).where(eq(schema.cards.id, id)).run();
    return c.json({ ok: true });
  });

  app.delete('/api/admin/users/:userId', (c) => {
    const id = c.req.param('userId');
    const me = c.get('user');
    if (id === me.id) {
      return c.json({ error: 'cannot_delete_self' }, 400);
    }
    const existing = db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .get();
    if (!existing) return c.json({ error: 'not_found' }, 404);
    db.delete(schema.users).where(eq(schema.users.id, id)).run();
    return c.json({ ok: true });
  });

  return app;
}
