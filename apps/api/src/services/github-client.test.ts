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
});
