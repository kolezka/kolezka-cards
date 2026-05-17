import { z } from 'zod';

const EnvSchema = z
  .object({
    APP_SECRET: z
      .string()
      .min(32, 'APP_SECRET must be at least 32 characters (32+ random bytes hex-encoded)'),
    BASE_URL: z.string().url(),
    DATABASE_PATH: z.string().min(1),
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
