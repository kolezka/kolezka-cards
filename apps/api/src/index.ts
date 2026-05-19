import { getClient, runStartupMigrations } from '@kc/db';
import { oauthConfigured, resolveDatabaseUrl } from '@kc/shared/env';
import { Hono } from 'hono';
import { createRenderCardRoute } from './cards/route';
import { env } from './env';
import { hashForLog, logger } from './logger';
import { csrfGuard } from './middleware/csrf';
import { renderAbuseLimit } from './middleware/rate-limit';
import { securityHeaders } from './middleware/security-headers';
import { staticServe } from './middleware/static-serve';
import { captureError, initSentry } from './observability/sentry';
import { createAdminRoute } from './routes/admin';
import { createAnalyticsRoute } from './routes/analytics';
import { createAuthRoute } from './routes/auth';
import { createCardsRoute } from './routes/cards';
import { createDevAnalyticsRoute } from './routes/dev-analytics';
import { healthz } from './routes/healthz';
import { createMeRoute } from './routes/me';
import { metrics as metricsRoute } from './routes/metrics';
import { createGitHubClient } from './services/github-client';
import { bumpCounter } from './services/metrics';

const databaseUrl = resolveDatabaseUrl(env);
try {
  const migration = await runStartupMigrations(databaseUrl);
  logger.info(
    {
      event: 'db.migrate',
      databaseUrl: migration.databaseUrl,
      applied: migration.applied,
      total: migration.total,
      latestHash: migration.latestHash,
    },
    `migrations applied=${migration.applied} total=${migration.total}`,
  );
} catch (err) {
  logger.fatal({ event: 'db.migrate.failed', err }, 'startup migration failed; refusing to boot');
  process.exit(1);
}

const { db } = getClient(databaseUrl);
await initSentry(env);

const app = new Hono();

app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  logger.debug(
    { method: c.req.method, path: c.req.path, status: c.res.status, latencyMs: Date.now() - start },
    'request',
  );
});

app.use('*', securityHeaders);
app.use('/c/*', renderAbuseLimit);

app.use('/api/*', async (c, next) => {
  const origin = new URL(env.BASE_URL).origin;
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-By');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (c.req.method === 'OPTIONS') return c.body(null, 204);
  await next();
});

app.use('/api/*', csrfGuard(env));

// Shared between render and me routes so the same in-memory cache covers
// both card SVG renders and the preview stats endpoint.
const github = createGitHubClient();

app.route('/', healthz);
app.route('/', metricsRoute);
app.route('/', createRenderCardRoute(db, github));
app.route('/', createAuthRoute(db, env));
app.route('/', createMeRoute(db, env, github));
app.route('/', createCardsRoute(db, env));
app.route('/', createAnalyticsRoute(db, env));
app.route('/', createAdminRoute(db, env));
app.route('/', createDevAnalyticsRoute(db));

if (env.WEB_BUILD_DIR) {
  app.use(
    '*',
    staticServe({
      root: env.WEB_BUILD_DIR,
      reservedPrefixes: ['/api', '/auth', '/c', '/healthz', '/metrics'],
      fallback: 'index.html',
    }),
  );
}

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
  logger.error({ err }, 'unhandled');
  bumpCounter('errors.unhandled');
  captureError(err);
  return c.json({ error: 'internal' }, 500);
});

const port = Number(Bun.env.PORT ?? 3001);
logger.info(
  {
    event: 'boot.config',
    port,
    nodeEnv: env.NODE_ENV,
    baseUrl: env.BASE_URL,
    databaseUrl: databaseUrl.replace(/:[^:@/]*@/, ':***@'),
    webBuildDir: env.WEB_BUILD_DIR ?? null,
    githubOauth: oauthConfigured(env),
    githubClientIdHash: hashForLog(env.GITHUB_CLIENT_ID),
    sentryConfigured: Boolean(env.SENTRY_DSN),
  },
  'boot config resolved',
);
logger.info({ port, env: env.NODE_ENV }, 'kc-api listening');

export default {
  port,
  fetch: app.fetch,
};
