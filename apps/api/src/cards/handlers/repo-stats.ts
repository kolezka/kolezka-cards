import { renderRepoStats } from '@kc/shared/svg/repo-stats';
import { RepoStatsConfig } from '@kc/shared/zod/card-config';
import type { CardHandler } from '../handler-types';
import { HandlerError } from '../handler-types';
import { applyQueryOverrides, pickDims, topLanguages } from '../utils';

export const renderRepoStatsHandler: CardHandler = async ({ config, query, github }) => {
  const merged = applyQueryOverrides(config, query);
  const parsed = RepoStatsConfig.parse(merged);
  const [owner, name] = parsed.repo.split('/');
  if (!owner || !name) throw new HandlerError(400, 'Invalid repo');

  const repo = await github.getRepo(owner, name);
  if (!repo) throw new HandlerError(404, 'Repo not found');

  const langs = (await github.getRepoLanguages(owner, name)) ?? {};
  return renderRepoStats(
    parsed,
    {
      owner,
      name,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      primaryLanguage: repo.language,
      languages: topLanguages(langs),
    },
    pickDims(parsed, query),
  );
};
