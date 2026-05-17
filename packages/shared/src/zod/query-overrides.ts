import { z } from 'zod';
import { THEME_NAMES } from '../themes';

const HexColor = z.string().regex(/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/, 'hex color');

export const QueryOverridesSchema = z
  .object({
    theme: z.enum(THEME_NAMES as unknown as [string, ...string[]]).optional(),
    title: z.string().max(80).optional(),
    accent: HexColor.optional(),
    background: HexColor.optional(),
    text: HexColor.optional(),
    muted: HexColor.optional(),
    border: HexColor.optional(),
    hide: z.string().optional(),
    w: z.coerce.number().int().min(200).max(1200).optional(),
    h: z.coerce.number().int().min(32).max(600).optional(),
    period: z.enum(['1m', '3m', '6m', '1y', '2y', 'all']).optional(),
    days: z.coerce.number().int().min(7).max(1825).optional(),
  })
  .partial();

export type QueryOverrides = z.infer<typeof QueryOverridesSchema>;

export function parseQueryOverrides(raw: Record<string, string | undefined>): QueryOverrides {
  const parsed = QueryOverridesSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

export function hiddenSections(query: QueryOverrides): Set<string> {
  if (!query.hide) return new Set();
  return new Set(
    query.hide
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}
