import { type DB, schema } from '@kc/db';
import { computeFingerprint } from '@kc/shared/fingerprint';
import { renderProfileStats } from '@kc/shared/svg/profile-stats';
import { renderProfileSummary } from '@kc/shared/svg/profile-summary';
import { renderRepoStats } from '@kc/shared/svg/repo-stats';
import { renderStreak } from '@kc/shared/svg/streak';
import { renderVisitCounter } from '@kc/shared/svg/visit-counter';
import {
  CardConfig,
  ProfileStatsConfig,
  ProfileSummaryConfig,
  RepoStatsConfig,
  StreakConfig,
  VisitCounterConfig,
} from '@kc/shared/zod/card-config';
import { hiddenSections, parseQueryOverrides } from '@kc/shared/zod/query-overrides';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { env } from '../env';
import { hashForLog, logger } from '../logger';
import { noCache } from '../middleware/no-cache';
import {
  type GitHubClient,
  type GitHubLanguages,
  createGitHubClient,
} from '../services/github-client';
import { computeStreakStats, fetchContributions } from '../services/github-contributions';
import { bumpCounter } from '../services/metrics';
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

function topLanguages(langs: GitHubLanguages, take = 4): Array<{ name: string; bytes: number }> {
  return Object.entries(langs)
    .map(([name, bytes]) => ({ name, bytes }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, take);
}

function applyQueryOverrides<T extends { theme?: unknown; title?: string; overrides?: unknown }>(
  cfg: T,
  q: ReturnType<typeof parseQueryOverrides>,
): T {
  const next = { ...cfg } as T;
  if (q.theme) (next as unknown as { theme: string }).theme = q.theme;
  if (q.title) (next as unknown as { title: string }).title = q.title;
  const overrides: Record<string, string> = {
    ...((next as unknown as { overrides?: Record<string, string> }).overrides ?? {}),
  };
  for (const k of ['accent', 'background', 'text', 'muted', 'border'] as const) {
    if (q[k]) overrides[k] = q[k] as string;
  }
  if (Object.keys(overrides).length > 0) {
    (next as unknown as { overrides: Record<string, string> }).overrides = overrides;
  }
  return next;
}

export function createRenderCardRoute(db: DB, github: GitHubClient = createGitHubClient()): Hono {
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
      .select({ card: schema.cards, ownerLogin: schema.users.login })
      .from(schema.cards)
      .innerJoin(schema.users, eq(schema.cards.userId, schema.users.id))
      .where(and(eq(schema.users.login, userLogin), eq(schema.cards.slug, slug)))
      .limit(1)
      .get();
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
    const fingerprint = computeFingerprint(
      {
        userAgent: headers['user-agent'] ?? '',
        acceptLanguage: headers['accept-language'] ?? '',
        acceptEncoding: headers['accept-encoding'] ?? '',
      },
      env.APP_SECRET,
    );

    const visit = trackVisit(db, {
      cardId: card.id,
      fingerprintHash: fingerprint,
      country: headers['cf-ipcountry'] ?? null,
      referrerHost: extractReferrerHost(headers.referer),
      userAgentFamily: userAgentFamily(headers['user-agent']),
    });

    let svg: string;
    try {
      switch (config.type) {
        case 'visit-counter': {
          const cfg = applyQueryOverrides(config, query);
          const parsed = VisitCounterConfig.parse(cfg);
          svg = renderVisitCounter(parsed, {
            totalImpressions: visit.totalImpressions,
            uniqueVisits: visit.uniqueVisits,
          });
          break;
        }
        case 'profile-stats': {
          const merged = applyQueryOverrides(config, query);
          const parsed = ProfileStatsConfig.parse(merged);
          if (hiddenSections(query).has('languages')) parsed.show.languages = false;
          const user = await github.getUser(row.ownerLogin);
          if (!user) return c.text('GitHub user not found', 404);
          const reposRes = await fetch(
            `https://api.github.com/users/${encodeURIComponent(row.ownerLogin)}/repos?per_page=100&sort=pushed`,
            { headers: { 'User-Agent': 'kolezka-cards', Accept: 'application/vnd.github+json' } },
          );
          let langs: Array<{ name: string; bytes: number }> = [];
          if (reposRes.ok) {
            const repos = (await reposRes.json()) as Array<{
              language: string | null;
              size: number;
            }>;
            const agg: Record<string, number> = {};
            for (const r of repos) {
              if (!r.language) continue;
              agg[r.language] = (agg[r.language] ?? 0) + (r.size || 1);
            }
            langs = topLanguages(agg);
          }
          svg = renderProfileStats(parsed, {
            login: user.login,
            publicRepos: user.public_repos,
            followers: user.followers,
            following: user.following,
            topLanguages: langs,
          });
          break;
        }
        case 'repo-stats': {
          const merged = applyQueryOverrides(config, query);
          const parsed = RepoStatsConfig.parse(merged);
          const [owner, name] = parsed.repo.split('/');
          if (!owner || !name) return c.text('Invalid repo', 400);
          const repo = await github.getRepo(owner, name);
          if (!repo) return c.text('Repo not found', 404);
          const langs = (await github.getRepoLanguages(owner, name)) ?? {};
          svg = renderRepoStats(parsed, {
            owner,
            name,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            primaryLanguage: repo.language,
            languages: topLanguages(langs),
          });
          break;
        }
        case 'streak': {
          const merged = applyQueryOverrides(config, query);
          const parsed = StreakConfig.parse(merged);
          const days = await fetchContributions(row.ownerLogin);
          if (!days) return c.text('GitHub user not found', 404);
          const stats = computeStreakStats(days);
          svg = renderStreak(parsed, {
            login: row.ownerLogin,
            ...stats,
          });
          break;
        }
        case 'profile-summary': {
          const merged = applyQueryOverrides(config, query);
          const parsed = ProfileSummaryConfig.parse(merged);
          const hidden = hiddenSections(query);
          for (const k of ['contributions', 'repos', 'joined', 'chart'] as const) {
            if (hidden.has(k)) parsed.show[k] = false;
          }
          const user = await github.getUser(row.ownerLogin);
          if (!user) return c.text('GitHub user not found', 404);
          const days = (await fetchContributions(row.ownerLogin)) ?? [];
          const stats = computeStreakStats(days);
          svg = renderProfileSummary(parsed, {
            login: user.login,
            publicRepos: user.public_repos,
            totalThisYear: stats.totalThisYear,
            joinedAt: user.created_at,
            contributions: days.map((d) => ({ date: d.date, count: d.count })),
          });
          break;
        }
      }
    } catch (err) {
      logger.warn({ err, cardId: card.id }, 'render fallback (github fetch failed)');
      return c.text('Upstream fetch failed', 502);
    }

    logger.info(
      {
        cardId: card.id,
        type: config.type,
        wasUnique: visit.wasUnique,
        country: headers['cf-ipcountry'] ?? null,
        latencyMs: Date.now() - start,
        uaHash: hashForLog(headers['user-agent']),
      },
      'render',
    );
    bumpCounter('render.total');
    bumpCounter('render.by_type', 1, { type: config.type });
    if (visit.wasUnique) bumpCounter('render.unique');

    c.header('Content-Type', 'image/svg+xml; charset=utf-8');
    return c.body(svg);
  });

  return app;
}
