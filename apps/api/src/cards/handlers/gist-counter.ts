import { renderGistCounter } from '@kc/shared/svg/gist-counter';
import { GistCounterConfig } from '@kc/shared/zod/card-config';
import type { CardHandler } from '../handler-types';
import { HandlerError } from '../handler-types';
import { applyQueryOverrides, fetchLatestGist, pickDims } from '../utils';

export const renderGistCounterHandler: CardHandler = async ({
  config,
  query,
  ownerLogin,
  github,
}) => {
  const merged = applyQueryOverrides(config, query);
  const parsed = GistCounterConfig.parse(merged);
  const user = await github.getUser(ownerLogin);
  if (!user) throw new HandlerError(404, 'GitHub user not found');
  const latest = parsed.show.latest ? await fetchLatestGist(ownerLogin) : null;
  return renderGistCounter(
    parsed,
    {
      login: ownerLogin,
      publicGists: user.public_gists ?? 0,
      latestGist: latest,
    },
    pickDims(parsed, query),
  );
};
