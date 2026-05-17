import { type DB, schema } from '@kc/db';
import { computeFingerprint, detectCamo, truncateIp } from '@kc/shared/fingerprint';
import {
  daysForPeriod as followersDaysForPeriod,
  renderFollowersSparkline,
} from '@kc/shared/svg/followers-sparkline';
import { renderGistCounter } from '@kc/shared/svg/gist-counter';
import { renderLanguages } from '@kc/shared/svg/languages';
import { renderProfileStats } from '@kc/shared/svg/profile-stats';
import { renderProfileSummary } from '@kc/shared/svg/profile-summary';
import { renderProfileViews } from '@kc/shared/svg/profile-views';
import { renderRepoStats } from '@kc/shared/svg/repo-stats';
import { renderStreak } from '@kc/shared/svg/streak';
import { renderTopRepos } from '@kc/shared/svg/top-repos';
import { renderVisitCounter } from '@kc/shared/svg/visit-counter';
import { renderWakatime } from '@kc/shared/svg/wakatime';
import {
  CardConfig,
  FollowersSparklineConfig,
  GistCounterConfig,
  LanguagesConfig,
  ProfileStatsConfig,
  ProfileSummaryConfig,
  ProfileViewsConfig,
  RepoStatsConfig,
  StreakConfig,
  TopReposConfig,
  VisitCounterConfig,
  WakatimeConfig,
} from '@kc/shared/zod/card-config';
import { hiddenSections, parseQueryOverrides } from '@kc/shared/zod/query-overrides';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { env } from '../env';
import { hashForLog, logger } from '../logger';
import { noCache } from '../middleware/no-cache';
import { getFollowersHistory, snapshotFollowers } from '../services/followers-history';
import {
  type GitHubClient,
  type GitHubLanguages,
  createGitHubClient,
} from '../services/github-client';
import { computeStreakStats, fetchContributions } from '../services/github-contributions';
import { bumpCounter } from '../services/metrics';
import { getVisitTotals, trackVisit } from '../services/visit-tracker';

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
 * landing/demo pages embed the same SVGs and would otherwise inflate metrics.
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

function topLanguages(langs: GitHubLanguages, take = 4): Array<{ name: string; bytes: number }> {
  return Object.entries(langs)
    .map(([name, bytes]) => ({ name, bytes }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, take);
}

function pickDims(
  cfg: { size?: { width?: number; height?: number } },
  q: { w?: number; h?: number },
): { width?: number; height?: number } {
  // Query overrides config; both fall back to per-renderer defaults.
  const width = q.w ?? cfg.size?.width;
  const height = q.h ?? cfg.size?.height;
  const dims: { width?: number; height?: number } = {};
  if (width !== undefined) dims.width = width;
  if (height !== undefined) dims.height = height;
  return dims;
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
      switch (config.type) {
        case 'visit-counter': {
          const cfg = applyQueryOverrides(config, query);
          const parsed = VisitCounterConfig.parse(cfg);
          svg = renderVisitCounter(
            parsed,
            {
              totalImpressions: visit.totalImpressions,
              uniqueVisits: visit.uniqueVisits,
            },
            pickDims(parsed, query),
          );
          break;
        }
        case 'profile-views': {
          const cfg = applyQueryOverrides(config, query);
          const parsed = ProfileViewsConfig.parse(cfg);
          const views = parsed.metric === 'unique' ? visit.uniqueVisits : visit.totalImpressions;
          svg = renderProfileViews(parsed, { views }, pickDims(parsed, query));
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
          svg = renderProfileStats(
            parsed,
            {
              login: user.login,
              publicRepos: user.public_repos,
              followers: user.followers,
              following: user.following,
              topLanguages: langs,
            },
            pickDims(parsed, query),
          );
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
          svg = renderRepoStats(
            parsed,
            {
              owner,
              name,
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              primaryLanguage: repo.language,
              languages: topLanguages(langs),
            },
            pickDims(parsed, query),
          );
          break;
        }
        case 'streak': {
          const merged = applyQueryOverrides(config, query);
          const parsed = StreakConfig.parse(merged);
          const days = await fetchContributions(row.ownerLogin);
          if (!days) return c.text('GitHub user not found', 404);
          const stats = computeStreakStats(days);
          svg = renderStreak(
            parsed,
            {
              login: row.ownerLogin,
              ...stats,
            },
            pickDims(parsed, query),
          );
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
          const periodOverride = query.period
            ? query.period
            : query.days !== undefined
              ? { days: query.days }
              : undefined;
          svg = renderProfileSummary(
            parsed,
            {
              login: user.login,
              publicRepos: user.public_repos,
              totalThisYear: stats.totalThisYear,
              joinedAt: user.created_at,
              contributions: days.map((d) => ({ date: d.date, count: d.count })),
            },
            {
              ...pickDims(parsed, query),
              ...(periodOverride ? { period: periodOverride } : {}),
            },
          );
          break;
        }
        case 'languages': {
          const merged = applyQueryOverrides(config, query);
          const parsed = LanguagesConfig.parse(merged);
          const reposRes = await fetch(
            `https://api.github.com/users/${encodeURIComponent(row.ownerLogin)}/repos?per_page=100&sort=pushed`,
            { headers: { 'User-Agent': 'kolezka-cards', Accept: 'application/vnd.github+json' } },
          );
          const agg: Record<string, number> = {};
          if (reposRes.ok) {
            const repos = (await reposRes.json()) as Array<{
              language: string | null;
              size: number;
            }>;
            for (const r of repos) {
              if (!r.language) continue;
              agg[r.language] = (agg[r.language] ?? 0) + (r.size || 1);
            }
          }
          const languages = Object.entries(agg).map(([name, bytes]) => ({ name, bytes }));
          svg = renderLanguages(
            parsed,
            { login: row.ownerLogin, languages },
            pickDims(parsed, query),
          );
          break;
        }
        case 'top-repos': {
          const merged = applyQueryOverrides(config, query);
          const parsed = TopReposConfig.parse(merged);
          const sortParam =
            parsed.sort === 'updated' ? 'pushed' : parsed.sort === 'forks' ? 'updated' : 'pushed';
          // GitHub /users/:user/repos supports sort=created|updated|pushed|full_name (no stars).
          // Fetch a reasonable batch and sort client-side by stars/forks/updated.
          const reposRes = await fetch(
            `https://api.github.com/users/${encodeURIComponent(row.ownerLogin)}/repos?per_page=100&sort=${sortParam}`,
            { headers: { 'User-Agent': 'kolezka-cards', Accept: 'application/vnd.github+json' } },
          );
          let topRepos: Array<{
            name: string;
            description: string | null;
            language: string | null;
            stars: number;
            forks: number;
            updatedAt: string | null;
          }> = [];
          if (reposRes.ok) {
            const repos = (await reposRes.json()) as Array<{
              name: string;
              description: string | null;
              language: string | null;
              stargazers_count: number;
              forks_count: number;
              pushed_at: string | null;
              fork: boolean;
              archived: boolean;
            }>;
            const candidates = repos
              .filter((r) => !r.fork && !r.archived)
              .map((r) => ({
                name: r.name,
                description: r.description,
                language: r.language,
                stars: r.stargazers_count,
                forks: r.forks_count,
                updatedAt: r.pushed_at,
              }));
            candidates.sort((a, b) => {
              if (parsed.sort === 'stars') return b.stars - a.stars;
              if (parsed.sort === 'forks') return b.forks - a.forks;
              const at = a.updatedAt ? Date.parse(a.updatedAt) : 0;
              const bt = b.updatedAt ? Date.parse(b.updatedAt) : 0;
              return bt - at;
            });
            topRepos = candidates.slice(0, parsed.limit);
          }
          svg = renderTopRepos(
            parsed,
            { login: row.ownerLogin, repos: topRepos },
            pickDims(parsed, query),
          );
          break;
        }
        case 'followers-sparkline': {
          const merged = applyQueryOverrides(config, query);
          const parsed = FollowersSparklineConfig.parse(merged);
          const user = await github.getUser(row.ownerLogin);
          if (!user) return c.text('GitHub user not found', 404);
          // Lazy snapshot: idempotently insert today's count for this user.
          // First-ever view starts the history; subsequent views top it up daily.
          await snapshotFollowers(db, card.userId, user.followers);
          // Pull recent history within the requested period
          const periodDays = followersDaysForPeriod(parsed.period);
          const sinceDay =
            parsed.period === 'all'
              ? undefined
              : new Date(Date.now() - periodDays * 86_400_000).toISOString().slice(0, 10);
          const history = await getFollowersHistory(db, card.userId, sinceDay);
          svg = renderFollowersSparkline(
            parsed,
            {
              login: row.ownerLogin,
              currentFollowers: user.followers,
              history,
            },
            pickDims(parsed, query),
          );
          break;
        }
        case 'wakatime': {
          const merged = applyQueryOverrides(config, query);
          const parsed = WakatimeConfig.parse(merged);
          // No (or stub) API key → render empty state without ever contacting
          // Wakatime. min length 20 is the floor for a plausibly-real token.
          if (!parsed.apiKey || parsed.apiKey.length < 20) {
            svg = renderWakatime(
              parsed,
              { login: row.ownerLogin, totalSeconds: 0, languages: [] },
              pickDims(parsed, query),
            );
            break;
          }
          // Wakatime "stats" endpoint provides aggregated language breakdown
          // for the chosen range with grand_total. https://wakatime.com/developers
          const url = `https://wakatime.com/api/v1/users/current/stats/${encodeURIComponent(parsed.range)}`;
          const res = await fetch(url, {
            headers: {
              Authorization: `Basic ${btoa(parsed.apiKey)}`,
              Accept: 'application/json',
              'User-Agent': 'kolezka-cards',
            },
          });
          if (!res.ok) {
            logger.warn(
              { cardId: card.id, status: res.status },
              'wakatime fetch failed; rendering empty state',
            );
            svg = renderWakatime(
              parsed,
              { login: row.ownerLogin, totalSeconds: 0, languages: [] },
              pickDims(parsed, query),
            );
          } else {
            const body = (await res.json()) as {
              data?: {
                total_seconds?: number;
                languages?: Array<{ name: string; total_seconds: number; percent: number }>;
              };
            };
            const total = body.data?.total_seconds ?? 0;
            const langs = (body.data?.languages ?? []).map((l) => ({
              name: l.name,
              seconds: l.total_seconds,
              percent: l.percent,
            }));
            svg = renderWakatime(
              parsed,
              { login: row.ownerLogin, totalSeconds: total, languages: langs },
              pickDims(parsed, query),
            );
          }
          break;
        }
        case 'gist-counter': {
          const merged = applyQueryOverrides(config, query);
          const parsed = GistCounterConfig.parse(merged);
          const user = await github.getUser(row.ownerLogin);
          if (!user) return c.text('GitHub user not found', 404);
          let latest: { description: string | null; updatedAt: string | null } | null = null;
          if (parsed.show.latest) {
            const gistsRes = await fetch(
              `https://api.github.com/users/${encodeURIComponent(row.ownerLogin)}/gists?per_page=1`,
              {
                headers: { 'User-Agent': 'kolezka-cards', Accept: 'application/vnd.github+json' },
              },
            );
            if (gistsRes.ok) {
              const arr = (await gistsRes.json()) as Array<{
                description: string | null;
                updated_at: string | null;
              }>;
              if (arr.length > 0 && arr[0]) {
                latest = {
                  description: arr[0].description,
                  updatedAt: arr[0].updated_at,
                };
              }
            }
          }
          svg = renderGistCounter(
            parsed,
            {
              login: row.ownerLogin,
              publicGists: user.public_gists ?? 0,
              latestGist: latest,
            },
            pickDims(parsed, query),
          );
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

    c.header('Content-Type', 'image/svg+xml; charset=utf-8');
    // Ask Chromium to send the higher-entropy hints on subsequent requests.
    // Browsers cache the directive per-origin; first request from a given
    // browser gets the legacy fingerprint, later ones get the richer one.
    c.header('Accept-CH', 'sec-ch-ua-arch, sec-ch-ua-bitness, sec-ch-ua-model, sec-ch-ua-platform');
    return c.body(svg);
  });

  return app;
}
