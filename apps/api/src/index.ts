import { getClient } from '@kc/db';
import { Hono } from 'hono';
import { env } from './env';
import { logger } from './logger';
import { csrfGuard } from './middleware/csrf';
import { createAuthRoute } from './routes/auth';
import { createDevAnalyticsRoute } from './routes/dev-analytics';
import { healthz } from './routes/healthz';
import { createMeRoute } from './routes/me';
import { createRenderCardRoute } from './routes/render-card';

const { db } = getClient(env.DATABASE_PATH);

const app = new Hono();

app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  logger.debug(
    { method: c.req.method, path: c.req.path, status: c.res.status, latencyMs: Date.now() - start },
    'request',
  );
});

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

app.route('/', healthz);
app.route('/', createRenderCardRoute(db));
app.route('/', createAuthRoute(db, env));
app.route('/', createMeRoute(db, env));
app.route('/', createDevAnalyticsRoute(db));

app.notFound((c) => c.json({ error: 'not_found' }, 404));
app.onError((err, c) => {
  logger.error({ err }, 'unhandled');
  return c.json({ error: 'internal' }, 500);
});

const port = Number(Bun.env.PORT ?? 3001);
logger.info({ port, env: env.NODE_ENV }, 'kc-api listening');

export default {
  port,
  fetch: app.fetch,
};
