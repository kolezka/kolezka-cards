import { renderProfileSummary } from '@kc/shared/svg/profile-summary';
import { ProfileSummaryConfig } from '@kc/shared/zod/card-config';
import { hiddenSections } from '@kc/shared/zod/query-overrides';
import { computeStreakStats, fetchContributions } from '../../services/github-contributions';
import type { CardHandler } from '../handler-types';
import { HandlerError } from '../handler-types';
import { applyQueryOverrides, pickDims } from '../utils';

export const renderProfileSummaryHandler: CardHandler = async ({
  config,
  query,
  ownerLogin,
  github,
}) => {
  const merged = applyQueryOverrides(config, query);
  const parsed = ProfileSummaryConfig.parse(merged);
  const hidden = hiddenSections(query);
  for (const k of ['contributions', 'repos', 'joined', 'chart'] as const) {
    if (hidden.has(k)) parsed.show[k] = false;
  }

  const user = await github.getUser(ownerLogin);
  if (!user) throw new HandlerError(404, 'GitHub user not found');

  const days = (await fetchContributions(ownerLogin)) ?? [];
  const stats = computeStreakStats(days);
  const periodOverride = query.period
    ? query.period
    : query.days !== undefined
      ? { days: query.days }
      : undefined;

  return renderProfileSummary(
    parsed,
    {
      login: user.login,
      publicRepos: user.public_repos,
      totalThisYear: stats.totalThisYear,
      joinedAt: user.created_at,
      contributions: days.map((d) => ({ date: d.date, count: d.count })),
    },
    {
      ...pickDims(parsed, query),
      ...(periodOverride ? { period: periodOverride } : {}),
    },
  );
};
