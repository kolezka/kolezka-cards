import { renderTopRepos } from '@kc/shared/svg/top-repos';
import { TopReposConfig } from '@kc/shared/zod/card-config';
import type { CardHandler } from '../handler-types';
import { applyQueryOverrides, fetchUserRepos, pickDims } from '../utils';

type TopRepoEntry = {
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  updatedAt: string | null;
};

export const renderTopReposHandler: CardHandler = async ({ config, query, ownerLogin }) => {
  const merged = applyQueryOverrides(config, query);
  const parsed = TopReposConfig.parse(merged);
  // GitHub /users/:user/repos supports sort=created|updated|pushed|full_name
  // (no stars). Fetch a reasonable batch and sort client-side by
  // stars/forks/updated.
  const sortParam: 'pushed' | 'updated' =
    parsed.sort === 'updated' ? 'pushed' : parsed.sort === 'forks' ? 'updated' : 'pushed';
  const repos = await fetchUserRepos(ownerLogin, sortParam);
  let topRepos: TopRepoEntry[] = [];
  if (repos) {
    const candidates = repos
      .filter((r) => !r.fork && !r.archived)
      .map<TopRepoEntry>((r) => ({
        name: r.name ?? '',
        description: r.description ?? null,
        language: r.language,
        stars: r.stargazers_count ?? 0,
        forks: r.forks_count ?? 0,
        updatedAt: r.pushed_at ?? null,
      }));
    candidates.sort((a, b) => {
      if (parsed.sort === 'stars') return b.stars - a.stars;
      if (parsed.sort === 'forks') return b.forks - a.forks;
      const at = a.updatedAt ? Date.parse(a.updatedAt) : 0;
      const bt = b.updatedAt ? Date.parse(b.updatedAt) : 0;
      return bt - at;
    });
    topRepos = candidates.slice(0, parsed.limit);
  }
  return renderTopRepos(parsed, { login: ownerLogin, repos: topRepos }, pickDims(parsed, query));
};
