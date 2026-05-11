import { z } from 'zod';

const EnvSchema = z.object({
  APP_SECRET: z
    .string()
    .min(32, 'APP_SECRET must be at least 32 characters (32+ random bytes hex-encoded)'),
  BASE_URL: z.string().url(),
  DATABASE_PATH: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
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
