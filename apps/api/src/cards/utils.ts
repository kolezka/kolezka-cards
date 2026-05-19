import type { parseQueryOverrides } from '@kc/shared/zod/query-overrides';
import type { GitHubLanguages } from '../services/github-client';

const GITHUB_HEADERS = {
  'User-Agent': 'kolezka-cards',
  Accept: 'application/vnd.github+json',
} as const;

export function pickDims(
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

export function applyQueryOverrides<
  T extends { theme?: unknown; title?: string; overrides?: unknown },
>(cfg: T, q: ReturnType<typeof parseQueryOverrides>): T {
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

export function topLanguages(
  langs: GitHubLanguages,
  take = 4,
): Array<{ name: string; bytes: number }> {
  return Object.entries(langs)
    .map(([name, bytes]) => ({ name, bytes }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, take);
}

type GithubRepoListEntry = {
  language: string | null;
  size: number;
  stargazers_count?: number;
  name?: string;
  description?: string | null;
  forks_count?: number;
  pushed_at?: string | null;
  fork?: boolean;
  archived?: boolean;
};

/**
 * Fetch up to 100 repos for a user, sorted server-side by the given key.
 * Returns null on a non-OK response (the caller decides whether to fall
 * back to an empty render or treat it as a 502).
 */
export async function fetchUserRepos(
  ownerLogin: string,
  sort: 'pushed' | 'updated' | 'created' | 'full_name' = 'pushed',
): Promise<GithubRepoListEntry[] | null> {
  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(ownerLogin)}/repos?per_page=100&sort=${sort}`,
    { headers: GITHUB_HEADERS },
  );
  if (!res.ok) return null;
  return (await res.json()) as GithubRepoListEntry[];
}

/**
 * Fetch the most recent public gist for a user, or null.
 */
export async function fetchLatestGist(
  ownerLogin: string,
): Promise<{ description: string | null; updatedAt: string | null } | null> {
  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(ownerLogin)}/gists?per_page=1`,
    { headers: GITHUB_HEADERS },
  );
  if (!res.ok) return null;
  const arr = (await res.json()) as Array<{
    description: string | null;
    updated_at: string | null;
  }>;
  if (arr.length === 0 || !arr[0]) return null;
  return { description: arr[0].description, updatedAt: arr[0].updated_at };
}

/**
 * Aggregate per-language byte counts across a repo list.
 */
export function aggregateLanguagesFromRepos(
  repos: Array<{ language: string | null; size: number }>,
): Record<string, number> {
  const agg: Record<string, number> = {};
  for (const r of repos) {
    if (!r.language) continue;
    agg[r.language] = (agg[r.language] ?? 0) + (r.size || 1);
  }
  return agg;
}
