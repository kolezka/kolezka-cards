import { type DB, schema } from '@kc/db';
import { computeFingerprint, detectCamo, truncateIp } from '@kc/shared/fingerprint';
import { CardConfig } from '@kc/shared/zod/card-config';
import { parseQueryOverrides } from '@kc/shared/zod/query-overrides';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { env } from '../env';
import { hashForLog, logger } from '../logger';
import { noCache } from '../middleware/no-cache';
import { type GitHubClient, createGitHubClient } from '../services/github-client';
import { bumpCounter } from '../services/metrics';
import { getVisitTotals, trackVisit } from '../services/visit-tracker';
import { HANDLERS } from './dispatch';
import { HandlerError } from './handler-types';

function extractReferrerHost(referer: string | undefined): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).host;
  } catch {
    return null;
  }
}

/**
 * Hosts whose Referer should NOT count as a card visit. By default this is
 * the app's own origin from BASE_URL — owner previews in /app/c/[id] or the
 * landing/demo pages embed the same SVGs and would otherwise inflate
 * metrics.
 */
function selfTrafficHost(baseUrl: string): string | null {
  try {
    return new URL(baseUrl).host || null;
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

// Umami tracking pixel pointing at the public share URL. The browser
// fetches it when rendering the SVG outside a Camo-proxied <img>; GitHub
// README embeds block external loads inside img-mode SVGs so the pixel
// only fires for direct opens, <object>/<iframe> embeds, and inline SVG.
const UMAMI_PIXEL =
  '<image href="https://umami.raqz.link/p/MmvVRTw36" x="-1" y="-1" width="1" height="1" aria-hidden="true" preserveAspectRatio="none"/>';

export function createRenderCardRoute(db: DB, github: GitHubClient = createGitHubClient()): Hono {
  const app = new Hono();
  app.use('*', noCache);

  // Computed once at startup so we don't re-parse BASE_URL on every render.
  const selfHost = selfTrafficHost(env.BASE_URL);

  app.get('/c/:userLogin/:slugWithExt', async (c) => {
    const start = Date.now();
    const { userLogin, slugWithExt } = c.req.param();
    if (!slugWithExt.endsWith('.svg')) {
      return c.text('Not found', 404);
    }
    const slug = slugWithExt.slice(0, -'.svg'.length);

    const row = (
      await db
        .select({ card: schema.cards, ownerLogin: schema.users.login })
        .from(schema.cards)
        .innerJoin(schema.users, eq(schema.cards.userId, schema.users.id))
        .where(and(eq(schema.users.login, userLogin), eq(schema.cards.slug, slug)))
        .limit(1)
    )[0];
    if (!row) return c.text('Not found', 404);
    const card = row.card;

    const parsedConfig = CardConfig.safeParse(card.configJson);
    if (!parsedConfig.success) {
      logger.error({ cardId: card.id, err: parsedConfig.error.flatten() }, 'invalid card config');
      return c.text('Invalid card config', 500);
    }
    const config = parsedConfig.data;
    const query = parseQueryOverrides(c.req.query());

    const headers = c.req.header();
    const viaCamo = detectCamo({
      userAgent: headers['user-agent'],
      via: headers.via,
    });
    const fingerprint = computeFingerprint(
      {
        userAgent: headers['user-agent'] ?? '',
        acceptLanguage: headers['accept-language'] ?? '',
        acceptEncoding: headers['accept-encoding'] ?? '',
        // Client hints — present on Chromium browsers; empty on Safari/Firefox,
        // empty when GitHub serves through Camo (Camo strips them). When they
        // do appear, they let us tell a mobile Chrome apart from a desktop
        // Chrome even after UA-reduction collapses the User-Agent string.
        secChUa: headers['sec-ch-ua'],
        secChUaMobile: headers['sec-ch-ua-mobile'],
        secChUaPlatform: headers['sec-ch-ua-platform'],
        // Higher-entropy hints — only sent by Chromium after we respond with
        // a matching Accept-CH header (set below). Empty on the very first
        // request from a given browser; populated thereafter.
        secChUaArch: headers['sec-ch-ua-arch'],
        secChUaBitness: headers['sec-ch-ua-bitness'],
        secChUaModel: headers['sec-ch-ua-model'],
        // Low-entropy country bucket; already stored separately for analytics.
        country: headers['cf-ipcountry'],
        // Truncated /24 (IPv4) or /64 (IPv6) prefix of the real visitor IP.
        // Skipped for Camo because the source IP is GitHub's pool, not the
        // viewer's — including it would synthesize false uniqueness across
        // different cards served through the same Camo instance.
        ...(viaCamo ? {} : { ipPrefix: truncateIp(headers['cf-connecting-ip']) }),
      },
      env.APP_SECRET,
    );

    const refererHost = extractReferrerHost(headers.referer);
    const isSelfTraffic = selfHost !== null && refererHost === selfHost;

    // Self-traffic (e.g. owner previewing in /app/c/[id]) reads the current
    // totals without bumping any counters so it can render the visit-counter
    // card correctly without inflating analytics.
    const visit = isSelfTraffic
      ? { wasUnique: false, ...(await getVisitTotals(db, card.id)) }
      : await trackVisit(db, {
          cardId: card.id,
          fingerprintHash: fingerprint,
          country: headers['cf-ipcountry'] ?? null,
          referrerHost: refererHost,
          userAgentFamily: userAgentFamily(headers['user-agent']),
          viaCamo,
        });

    let svg: string;
    try {
      const handler = HANDLERS[config.type];
      svg = await handler({
        config,
        query,
        card,
        ownerLogin: row.ownerLogin,
        db,
        github,
        visit,
      });
    } catch (err) {
      if (err instanceof HandlerError) {
        return c.text(err.message, err.status);
      }
      logger.warn({ err, cardId: card.id }, 'render fallback (github fetch failed)');
      return c.text('Upstream fetch failed', 502);
    }

    logger.info(
      {
        cardId: card.id,
        type: config.type,
        wasUnique: visit.wasUnique,
        selfTraffic: isSelfTraffic,
        country: headers['cf-ipcountry'] ?? null,
        latencyMs: Date.now() - start,
        uaHash: hashForLog(headers['user-agent']),
      },
      'render',
    );
    if (isSelfTraffic) {
      bumpCounter('render.self_traffic');
    } else {
      bumpCounter('render.total');
      bumpCounter('render.by_type', 1, { type: config.type });
      if (visit.wasUnique) bumpCounter('render.unique');
    }

    svg = svg.replace(/<\/svg>\s*$/, `${UMAMI_PIXEL}</svg>`);

    c.header('Content-Type', 'image/svg+xml; charset=utf-8');
    // Ask Chromium to send the higher-entropy hints on subsequent requests.
    // Browsers cache the directive per-origin; first request from a given
    // browser gets the legacy fingerprint, later ones get the richer one.
    c.header('Accept-CH', 'sec-ch-ua-arch, sec-ch-ua-bitness, sec-ch-ua-model, sec-ch-ua-platform');
    return c.body(svg);
  });

  return app;
}
