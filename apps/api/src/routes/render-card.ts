import { type DB, schema } from '@kc/db';
import { computeFingerprint } from '@kc/shared/fingerprint';
import { renderVisitCounter } from '@kc/shared/svg/visit-counter';
import { VisitCounterConfig } from '@kc/shared/zod/card-config';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { env } from '../env';
import { hashForLog, logger } from '../logger';
import { noCache } from '../middleware/no-cache';
import { trackVisit } from '../services/visit-tracker';

function extractReferrerHost(referer: string | undefined): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).host;
  } catch {
    return null;
  }
}

function userAgentFamily(ua: string | undefined): string | null {
  if (!ua) return null;
  const lower = ua.toLowerCase();
  if (lower.includes('camo')) return 'camo';
  if (lower.includes('firefox')) return 'firefox';
  if (lower.includes('edg/')) return 'edge';
  if (lower.includes('chrome')) return 'chrome';
  if (lower.includes('safari')) return 'safari';
  if (lower.includes('curl')) return 'curl';
  if (lower.includes('bot')) return 'bot';
  return 'other';
}

export function createRenderCardRoute(db: DB): Hono {
  const app = new Hono();

  app.use('*', noCache);

  app.get('/c/:userLogin/:slugWithExt', async (c) => {
    const start = Date.now();
    const { userLogin, slugWithExt } = c.req.param();
    if (!slugWithExt.endsWith('.svg')) {
      return c.text('Not found', 404);
    }
    const slug = slugWithExt.slice(0, -'.svg'.length);

    const row = db
      .select({
        card: schema.cards,
      })
      .from(schema.cards)
      .innerJoin(schema.users, eq(schema.cards.userId, schema.users.id))
      .where(and(eq(schema.users.login, userLogin), eq(schema.cards.slug, slug)))
      .limit(1)
      .get();

    if (!row) return c.text('Not found', 404);
    const card = row.card;

    if (card.type !== 'visit-counter') {
      return c.text(`Card type "${card.type}" not implemented yet`, 501);
    }

    const parsedConfig = VisitCounterConfig.safeParse(card.configJson);
    if (!parsedConfig.success) {
      logger.error({ cardId: card.id, err: parsedConfig.error.flatten() }, 'invalid card config');
      return c.text('Invalid card config', 500);
    }

    const headers = c.req.header();
    const fingerprint = computeFingerprint(
      {
        userAgent: headers['user-agent'] ?? '',
        acceptLanguage: headers['accept-language'] ?? '',
        acceptEncoding: headers['accept-encoding'] ?? '',
      },
      env.APP_SECRET,
    );

    const result = trackVisit(db, {
      cardId: card.id,
      fingerprintHash: fingerprint,
      country: headers['cf-ipcountry'] ?? null,
      referrerHost: extractReferrerHost(headers.referer),
      userAgentFamily: userAgentFamily(headers['user-agent']),
    });

    const svg = renderVisitCounter(parsedConfig.data, {
      totalImpressions: result.totalImpressions,
      uniqueVisits: result.uniqueVisits,
    });

    logger.info(
      {
        cardId: card.id,
        wasUnique: result.wasUnique,
        country: headers['cf-ipcountry'] ?? null,
        latencyMs: Date.now() - start,
        uaHash: hashForLog(headers['user-agent']),
      },
      'render',
    );

    c.header('Content-Type', 'image/svg+xml; charset=utf-8');
    return c.body(svg);
  });

  return app;
}
