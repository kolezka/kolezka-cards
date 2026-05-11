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
