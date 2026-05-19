import { renderStreak } from '@kc/shared/svg/streak';
import { StreakConfig } from '@kc/shared/zod/card-config';
import { computeStreakStats, fetchContributions } from '../../services/github-contributions';
import type { CardHandler } from '../handler-types';
import { HandlerError } from '../handler-types';
import { applyQueryOverrides, pickDims } from '../utils';

export const renderStreakHandler: CardHandler = async ({ config, query, ownerLogin }) => {
  const merged = applyQueryOverrides(config, query);
  const parsed = StreakConfig.parse(merged);
  const days = await fetchContributions(ownerLogin);
  if (!days) throw new HandlerError(404, 'GitHub user not found');
  const stats = computeStreakStats(days);
  return renderStreak(parsed, { login: ownerLogin, ...stats }, pickDims(parsed, query));
};
