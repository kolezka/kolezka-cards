import { renderProfileStats } from '@kc/shared/svg/profile-stats';
import { ProfileStatsConfig } from '@kc/shared/zod/card-config';
import { hiddenSections } from '@kc/shared/zod/query-overrides';
import type { CardHandler } from '../handler-types';
import { HandlerError } from '../handler-types';
import {
  aggregateLanguagesFromRepos,
  applyQueryOverrides,
  fetchUserRepos,
  pickDims,
  topLanguages,
} from '../utils';

export const renderProfileStatsHandler: CardHandler = async ({
  config,
  query,
  ownerLogin,
  github,
}) => {
  const merged = applyQueryOverrides(config, query);
  const parsed = ProfileStatsConfig.parse(merged);
  if (hiddenSections(query).has('languages')) parsed.show.languages = false;

  const user = await github.getUser(ownerLogin);
  if (!user) throw new HandlerError(404, 'GitHub user not found');

  const repos = await fetchUserRepos(ownerLogin);
  const langs = repos ? topLanguages(aggregateLanguagesFromRepos(repos)) : [];

  return renderProfileStats(
    parsed,
    {
      login: user.login,
      publicRepos: user.public_repos,
      followers: user.followers,
      following: user.following,
      topLanguages: langs,
    },
    pickDims(parsed, query),
  );
};
