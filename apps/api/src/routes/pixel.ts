import { type DB, schema } from '@kc/db';
import { detectCamo } from '@kc/shared/fingerprint';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { env } from '../env';
import { logger } from '../logger';

// 1x1 transparent GIF89a — minimal 43-byte payload.
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

function extractReferrerHost(referer: string | undefined): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).host;
  } catch {
    return null;
  }
}

function selfTrafficHost(baseUrl: string): string | null {
  try {
    return new URL(baseUrl).host || null;
  } catch {
    return null;
  }
}

export function createPixelRoute(db: DB): Hono {
  const app = new Hono();
  const selfHost = selfTrafficHost(env.BASE_URL);
  const baseHostname = (() => {
    try {
      return new URL(env.BASE_URL).host;
    } catch {
      return null;
    }
  })();
  const umamiHost = env.UMAMI_HOST;
  const umamiWebsite = env.UMAMI_WEBSITE_ID;
  const umamiEnabled = Boolean(umamiHost && umamiWebsite);

  app.get('/p/:cardIdWithExt', async (c) => {
    const { cardIdWithExt } = c.req.param();
    // Always respond with a 1x1 GIF regardless of beacon outcome — the SVG
    // shouldn't render a broken-image glyph if Umami is misconfigured.
    const respond = () => {
      c.header('Content-Type', 'image/gif');
      c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      c.header('Pragma', 'no-cache');
      return c.body(TRANSPARENT_GIF);
    };

    if (!cardIdWithExt.endsWith('.gif')) return respond();
    const cardId = cardIdWithExt.slice(0, -'.gif'.length);
    if (!umamiEnabled) return respond();

    const row = (
      await db
        .select({
          slug: schema.cards.slug,
          type: schema.cards.type,
          ownerLogin: schema.users.login,
        })
        .from(schema.cards)
        .innerJoin(schema.users, eq(schema.users.id, schema.cards.userId))
        .where(eq(schema.cards.id, cardId))
        .limit(1)
    )[0];
    if (!row) return respond();

    const headers = c.req.header();
    const referer = headers.referer;
    const refererHost = extractReferrerHost(referer);
    const isSelfTraffic = selfHost !== null && refererHost === selfHost;
    if (isSelfTraffic) return respond();

    const viaCamo = detectCamo({ userAgent: headers['user-agent'], via: headers.via });
    const payload = {
      type: 'event',
      payload: {
        website: umamiWebsite,
        hostname: baseHostname,
        url: `/c/${row.ownerLogin}/${row.slug}.svg`,
        referrer: referer ?? '',
        language: (headers['accept-language'] ?? '').split(',')[0] ?? '',
        screen: '',
        title: `${row.type} · ${row.ownerLogin}/${row.slug}`,
        name: 'card-pixel',
        data: { card_type: row.type, via_camo: viaCamo },
      },
    };

    // Fire-and-forget. Pixel response must not depend on Umami's latency or
    // availability, and a slow beacon shouldn't keep the request handler open.
    fetch(`${umamiHost}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': headers['user-agent'] ?? 'kolezka-cards',
        ...(headers['x-forwarded-for'] ? { 'X-Forwarded-For': headers['x-forwarded-for'] } : {}),
      },
      body: JSON.stringify(payload),
    }).catch((err) => {
      logger.warn({ err, cardId }, 'umami pixel beacon failed');
    });

    return respond();
  });

  return app;
}
