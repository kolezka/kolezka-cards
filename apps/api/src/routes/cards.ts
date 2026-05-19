import { type DB, schema } from '@kc/db';
import type { Env } from '@kc/shared/env';
import { CardConfig } from '@kc/shared/zod/card-config';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { type SessionContext, requireSession } from '../middleware/session';

const SlugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/i, 'slug must be url-safe (a-z, 0-9, hyphen)');

const CreateCardBody = z.object({
  slug: SlugSchema,
  config: CardConfig,
});

const PatchCardBody = z
  .object({
    slug: SlugSchema.optional(),
    config: CardConfig.optional(),
  })
  .refine((v) => v.slug || v.config, { message: 'one of slug | config required' });

function publicCard(card: schema.Card, ownerLogin: string) {
  return {
    id: card.id,
    slug: card.slug,
    type: card.type,
    theme: card.theme,
    config: card.configJson,
    ownerLogin,
    url: `/c/${ownerLogin}/${card.slug}.svg`,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
}

export function createCardsRoute(db: DB, env: Env): Hono<SessionContext> {
  const app = new Hono<SessionContext>();
  app.use('/api/cards', requireSession(db, env));
  app.use('/api/cards/*', requireSession(db, env));

  app.get('/api/cards', async (c) => {
    const user = c.get('user');
    const rows = await db.select().from(schema.cards).where(eq(schema.cards.userId, user.id));
    return c.json(rows.map((r) => publicCard(r, user.login)));
  });

  app.post('/api/cards', async (c) => {
    const user = c.get('user');
    const body = await c.req.json().catch(() => null);
    const parsed = CreateCardBody.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_body', issues: parsed.error.flatten() }, 400);
    }
    const dup = (
      await db
        .select({ id: schema.cards.id })
        .from(schema.cards)
        .where(and(eq(schema.cards.userId, user.id), eq(schema.cards.slug, parsed.data.slug)))
        .limit(1)
    )[0];
    if (dup) return c.json({ error: 'slug_taken' }, 409);

    const id = nanoid(12);
    const inserted = await db
      .insert(schema.cards)
      .values({
        id,
        userId: user.id,
        slug: parsed.data.slug,
        type: parsed.data.config.type,
        theme: (parsed.data.config as { theme?: string }).theme ?? 'github_dark',
        configJson: parsed.data.config,
      })
      .returning();
    const card = inserted[0];
    if (!card) {
      // RETURNING normally yields exactly one row for a successful single-row
      // insert; defending against an empty result so the route never returns
      // a 2xx with no body (which surfaces as "JSON.parse: unexpected end of
      // data" on the client).
      return c.json({ error: 'insert_failed' }, 500);
    }
    return c.json(publicCard(card, user.login), 201);
  });

  app.get('/api/cards/:id', async (c) => {
    const user = c.get('user');
    const card = (
      await db
        .select()
        .from(schema.cards)
        .where(and(eq(schema.cards.id, c.req.param('id')), eq(schema.cards.userId, user.id)))
        .limit(1)
    )[0];
    if (!card) return c.json({ error: 'not_found' }, 404);
    return c.json(publicCard(card, user.login));
  });

  app.patch('/api/cards/:id', async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const card = (
      await db
        .select()
        .from(schema.cards)
        .where(and(eq(schema.cards.id, id), eq(schema.cards.userId, user.id)))
        .limit(1)
    )[0];
    if (!card) return c.json({ error: 'not_found' }, 404);

    const body = await c.req.json().catch(() => null);
    const parsed = PatchCardBody.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'invalid_body', issues: parsed.error.flatten() }, 400);
    }
    if (parsed.data.slug && parsed.data.slug !== card.slug) {
      const dup = (
        await db
          .select({ id: schema.cards.id })
          .from(schema.cards)
          .where(and(eq(schema.cards.userId, user.id), eq(schema.cards.slug, parsed.data.slug)))
          .limit(1)
      )[0];
      if (dup) return c.json({ error: 'slug_taken' }, 409);
    }

    await db
      .update(schema.cards)
      .set({
        slug: parsed.data.slug ?? card.slug,
        type: parsed.data.config?.type ?? card.type,
        theme: (parsed.data.config as { theme?: string } | undefined)?.theme ?? card.theme,
        configJson: parsed.data.config ?? card.configJson,
        updatedAt: new Date(),
      })
      .where(eq(schema.cards.id, id));
    const updated = (
      await db.select().from(schema.cards).where(eq(schema.cards.id, id)).limit(1)
    )[0]!;
    return c.json(publicCard(updated, user.login));
  });

  app.delete('/api/cards/:id', async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const card = (
      await db
        .select({ id: schema.cards.id })
        .from(schema.cards)
        .where(and(eq(schema.cards.id, id), eq(schema.cards.userId, user.id)))
        .limit(1)
    )[0];
    if (!card) return c.json({ error: 'not_found' }, 404);
    await db.delete(schema.cards).where(eq(schema.cards.id, id));
    return c.json({ ok: true });
  });

  return app;
}
