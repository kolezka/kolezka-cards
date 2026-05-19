import { renderLanguages } from '@kc/shared/svg/languages';
import { LanguagesConfig } from '@kc/shared/zod/card-config';
import type { CardHandler } from '../handler-types';
import {
  aggregateLanguagesFromRepos,
  applyQueryOverrides,
  fetchUserRepos,
  pickDims,
} from '../utils';

export const renderLanguagesHandler: CardHandler = async ({ config, query, ownerLogin }) => {
  const merged = applyQueryOverrides(config, query);
  const parsed = LanguagesConfig.parse(merged);
  const repos = await fetchUserRepos(ownerLogin);
  const agg = repos ? aggregateLanguagesFromRepos(repos) : {};
  const languages = Object.entries(agg).map(([name, bytes]) => ({ name, bytes }));
  return renderLanguages(parsed, { login: ownerLogin, languages }, pickDims(parsed, query));
};
