export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string | null;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string | null;
}

export interface GitHubRepo {
  stargazers_count: number;
  forks_count: number;
  language: string | null;
}

export type GitHubLanguages = Record<string, number>;

export interface GitHubClient {
  getUser(login: string): Promise<GitHubUser | null>;
  getRepo(owner: string, name: string): Promise<GitHubRepo | null>;
  getRepoLanguages(owner: string, name: string): Promise<GitHubLanguages | null>;
  clearCache(): void;
}

export interface GitHubClientOptions {
  ttlMs?: number;
  fetcher?: typeof fetch;
  baseUrl?: string;
  /**
   * Optional PAT. When set, lifts the GitHub REST API rate limit from
   * 60 req/hour (unauthenticated, shared per IP) to 5000 req/hour. A
   * fine-grained token with read-only public-repo access is sufficient.
   */
  token?: string;
}

const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000;
// Brief cache for non-OK / non-404 responses (403 rate-limited, 5xx). Without
// this, a cards-list page render that hits a rate-limited API would retry
// every dependent card on every page view, prolonging the outage and burning
// any remaining quota. One minute is long enough to absorb a burst of
// concurrent requests but short enough that a fixed config (token added,
// transient 5xx resolved) recovers quickly.
const ERROR_TTL_MS = 60 * 1000;

interface CacheEntry<T> {
  value?: T | null;
  error?: Error;
  expiresAt: number;
}

export function createGitHubClient(opts: GitHubClientOptions = {}): GitHubClient {
  const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;
  const fetcher = opts.fetcher ?? fetch;
  const baseUrl = opts.baseUrl ?? 'https://api.github.com';
  const token = opts.token;
  const cache = new Map<string, CacheEntry<unknown>>();

  async function getJson<T>(url: string): Promise<T | null> {
    const cached = cache.get(url);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      if (cached.error) throw cached.error;
      return cached.value as T | null;
    }
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'kolezka-cards',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetcher(url, { headers });
    if (res.ok) {
      const value = (await res.json()) as T;
      cache.set(url, { value, expiresAt: now + ttl });
      return value;
    }
    if (res.status === 404) {
      cache.set(url, { value: null, expiresAt: now + ttl });
      return null;
    }
    // Surface GitHub's rate-limit headers in the error message so logs
    // make it obvious whether the 403 is "60/hr quota exhausted" or a
    // token / scope problem.
    const remaining = res.headers.get('x-ratelimit-remaining');
    const reset = res.headers.get('x-ratelimit-reset');
    const limit = res.headers.get('x-ratelimit-limit');
    let detail = '';
    if (remaining === '0') {
      const resetIso = reset ? new Date(Number(reset) * 1000).toISOString() : 'unknown';
      const tokenAdvice = token
        ? 'token quota exhausted'
        : 'no token set — set GITHUB_TOKEN to raise the limit from 60/hr to 5000/hr';
      detail = ` (rate limit ${limit ?? '?'}/hr exhausted, resets at ${resetIso}; ${tokenAdvice})`;
    } else if (res.status === 401) {
      detail = ' (auth rejected — GITHUB_TOKEN missing, expired, or insufficient scope)';
    }
    const err = new Error(`github ${url} returned ${res.status}${detail}`);
    cache.set(url, { error: err, expiresAt: now + ERROR_TTL_MS });
    throw err;
  }

  return {
    getUser: (login) => getJson<GitHubUser>(`${baseUrl}/users/${encodeURIComponent(login)}`),
    getRepo: (owner, name) =>
      getJson<GitHubRepo>(
        `${baseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
      ),
    getRepoLanguages: (owner, name) =>
      getJson<GitHubLanguages>(
        `${baseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/languages`,
      ),
    clearCache: () => cache.clear(),
  };
}
