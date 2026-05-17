import { z } from 'zod';

const EnvSchema = z
  .object({
    APP_SECRET: z
      .string()
      .min(32, 'APP_SECRET must be at least 32 characters (32+ random bytes hex-encoded)'),
    BASE_URL: z.string().url(),
    /**
     * Canonical Postgres connection string. If unset, the API composes one
     * from POSTGRES_HOST / POSTGRES_PORT / POSTGRES_USER / POSTGRES_PASSWORD
     * / POSTGRES_DB (see {@link resolveDatabaseUrl}). Either form is fine —
     * Coolify can either inject a single DATABASE_URL or the individual
     * service-variable bundle.
     */
    DATABASE_URL: z.string().min(1).optional(),
    POSTGRES_HOST: z.string().min(1).optional(),
    POSTGRES_PORT: z.string().regex(/^\d+$/).optional(),
    POSTGRES_USER: z.string().min(1).optional(),
    POSTGRES_PASSWORD: z.string().min(1).optional(),
    POSTGRES_DB: z.string().min(1).optional(),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    GITHUB_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
    SENTRY_DSN: z.string().url().optional(),
    WEB_BUILD_DIR: z.string().optional(),
    /**
     * Comma-separated GitHub logins granted admin access. Optional; if unset
     * or empty no user is an admin. Matched case-insensitively against
     * `users.login`.
     */
    ADMIN_LOGINS: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    const idSet = Boolean(env.GITHUB_CLIENT_ID);
    const secretSet = Boolean(env.GITHUB_CLIENT_SECRET);
    if (idSet !== secretSet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['GITHUB_CLIENT_SECRET'],
        message: 'GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must both be set or both unset',
      });
    }
    // Need either DATABASE_URL or the full POSTGRES_* bundle (host/user/db
    // are mandatory; password and port have sensible fallbacks). Tests use
    // PGlite directly and bypass the connection layer, so we don't require
    // either when NODE_ENV=test.
    if (env.NODE_ENV !== 'test' && !env.DATABASE_URL) {
      const missing: string[] = [];
      if (!env.POSTGRES_HOST) missing.push('POSTGRES_HOST');
      if (!env.POSTGRES_USER) missing.push('POSTGRES_USER');
      if (!env.POSTGRES_DB) missing.push('POSTGRES_DB');
      if (missing.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATABASE_URL'],
          message: `Set DATABASE_URL, or provide ${missing.join(', ')}`,
        });
      }
    }
  });

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: Record<string, string | undefined> = Bun.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const lines = Object.entries(flat).map(([k, errs]) => `  - ${k}: ${errs?.join(', ')}`);
    throw new Error(`Invalid environment:\n${lines.join('\n')}`);
  }
  return parsed.data;
}

export function oauthConfigured(env: Env): boolean {
  return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
}

/**
 * Resolve the Postgres connection string from the env, preferring an
 * explicit DATABASE_URL and falling back to the POSTGRES_* bundle. Throws
 * if neither is sufficient (the Zod schema also enforces this at boot, so
 * in practice this branch only fires from helper scripts).
 */
export function resolveDatabaseUrl(env: Env): string {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  const host = env.POSTGRES_HOST;
  const user = env.POSTGRES_USER;
  const db = env.POSTGRES_DB;
  if (!host || !user || !db) {
    throw new Error('DATABASE_URL or POSTGRES_HOST/USER/DB must be set');
  }
  const port = env.POSTGRES_PORT ?? '5432';
  const password = env.POSTGRES_PASSWORD ?? '';
  const auth = password
    ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
    : encodeURIComponent(user);
  return `postgresql://${auth}@${host}:${port}/${encodeURIComponent(db)}`;
}

export function parseAdminLogins(raw: string | undefined | null): Set<string> {
  if (!raw) return new Set();
  const out = new Set<string>();
  for (const part of raw.split(',')) {
    const trimmed = part.trim().toLowerCase();
    if (trimmed) out.add(trimmed);
  }
  return out;
}

export function isAdminLogin(env: Env, login: string | undefined | null): boolean {
  if (!login) return false;
  return parseAdminLogins(env.ADMIN_LOGINS).has(login.toLowerCase());
}
