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

interface CacheEntry<T> {
  value: T | null;
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
      return cached.value as T | null;
    }
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'kolezka-cards',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetcher(url, { headers });
    let value: T | null = null;
    if (res.ok) {
      value = (await res.json()) as T;
    } else if (res.status === 404) {
      value = null;
    } else {
      // Don't cache transient errors (5xx, 403 rate-limited)
      throw new Error(`github ${url} returned ${res.status}`);
    }
    cache.set(url, { value, expiresAt: now + ttl });
    return value;
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
