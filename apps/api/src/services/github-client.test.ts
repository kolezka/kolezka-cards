import { afterEach, describe, expect, it, mock } from 'bun:test';
import { createGitHubClient } from './github-client';

const userFixture = {
  id: 1,
  login: 'octocat',
  avatar_url: 'http://avatar',
  public_repos: 7,
  followers: 5000,
  following: 9,
};

function makeFetch(map: Record<string, unknown>) {
  return mock(async (url: string | URL) => {
    const key = url.toString();
    const body = map[key];
    if (body === undefined) {
      return new Response(JSON.stringify({ message: 'not found' }), { status: 404 });
    }
    return new Response(JSON.stringify(body), { status: 200 });
  });
}

afterEach(() => {
  // bun:test mocks per-test
});

describe('GitHubClient', () => {
  it('fetches and caches user data', async () => {
    const fetcher = makeFetch({
      'https://api.github.com/users/octocat': userFixture,
    });
    const client = createGitHubClient({ ttlMs: 60_000, fetcher: fetcher as never });
    const a = await client.getUser('octocat');
    const b = await client.getUser('octocat');
    expect(a?.login).toBe('octocat');
    expect(b?.login).toBe('octocat');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches after TTL expires', async () => {
    const fetcher = makeFetch({ 'https://api.github.com/users/octocat': userFixture });
    const client = createGitHubClient({ ttlMs: 1, fetcher: fetcher as never });
    await client.getUser('octocat');
    await new Promise((r) => setTimeout(r, 5));
    await client.getUser('octocat');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('returns null when GitHub responds 404', async () => {
    const fetcher = makeFetch({});
    const client = createGitHubClient({ ttlMs: 60_000, fetcher: fetcher as never });
    const u = await client.getUser('nope');
    expect(u).toBeNull();
  });

  it('caches negative results (404) for the same TTL', async () => {
    const fetcher = makeFetch({});
    const client = createGitHubClient({ ttlMs: 60_000, fetcher: fetcher as never });
    await client.getUser('nope');
    await client.getUser('nope');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('fetches repo data', async () => {
    const fetcher = makeFetch({
      'https://api.github.com/repos/octocat/hello': {
        stargazers_count: 42,
        forks_count: 7,
        language: 'TypeScript',
      },
    });
    const client = createGitHubClient({ ttlMs: 60_000, fetcher: fetcher as never });
    const r = await client.getRepo('octocat', 'hello');
    expect(r?.stargazers_count).toBe(42);
  });

  it('fetches language breakdown', async () => {
    const fetcher = makeFetch({
      'https://api.github.com/repos/octocat/hello/languages': {
        TypeScript: 8000,
        Svelte: 2000,
      },
    });
    const client = createGitHubClient({ ttlMs: 60_000, fetcher: fetcher as never });
    const langs = await client.getRepoLanguages('octocat', 'hello');
    expect(langs?.TypeScript).toBe(8000);
  });

  it('annotates rate-limited 403s and tells operator to set a token', async () => {
    const fetcher = mock(
      async () =>
        new Response(JSON.stringify({ message: 'API rate limit exceeded' }), {
          status: 403,
          headers: {
            'x-ratelimit-limit': '60',
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': '4000000000',
          },
        }),
    );
    const client = createGitHubClient({ ttlMs: 60_000, fetcher: fetcher as never });
    let caught: Error | null = null;
    try {
      await client.getUser('octocat');
    } catch (e) {
      caught = e as Error;
    }
    expect(caught).not.toBeNull();
    expect(caught?.message).toContain('returned 403');
    expect(caught?.message).toContain('rate limit 60/hr exhausted');
    expect(caught?.message).toContain('GITHUB_TOKEN');
  });

  it('briefly caches errors so a burst does not retry-storm GitHub', async () => {
    const fetcher = mock(async () => new Response('{}', { status: 503 }));
    const client = createGitHubClient({ ttlMs: 60_000, fetcher: fetcher as never });
    // Sequential bursts within the error TTL window: only the first
    // should hit GitHub, the rest replay the cached error.
    for (let i = 0; i < 3; i += 1) {
      try {
        await client.getUser('octocat');
      } catch {
        /* expected */
      }
    }
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('dedupes concurrent in-flight requests to the same URL', async () => {
    // Slow fetcher so all three calls are mid-flight at once.
    const pending: Array<(v: Response) => void> = [];
    const fetcher = mock(
      () =>
        new Promise<Response>((resolve) => {
          pending.push(resolve);
        }),
    );
    const client = createGitHubClient({ ttlMs: 60_000, fetcher: fetcher as never });
    const promises = [
      client.getUser('octocat'),
      client.getUser('octocat'),
      client.getUser('octocat'),
    ];
    // Resolve the in-flight fetch once the three calls have queued up.
    await new Promise((r) => setTimeout(r, 5));
    const resolve = pending[0];
    if (resolve) resolve(new Response(JSON.stringify(userFixture), { status: 200 }));
    const [a, b, c] = await Promise.all(promises);
    expect(a?.login).toBe('octocat');
    expect(b?.login).toBe('octocat');
    expect(c?.login).toBe('octocat');
    // Three concurrent callers, one HTTP request.
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
