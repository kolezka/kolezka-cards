import {
  daysForPeriod as followersDaysForPeriod,
  renderFollowersSparkline,
} from '@kc/shared/svg/followers-sparkline';
import { FollowersSparklineConfig } from '@kc/shared/zod/card-config';
import { getFollowersHistory, snapshotFollowers } from '../../services/followers-history';
import type { CardHandler } from '../handler-types';
import { HandlerError } from '../handler-types';
import { applyQueryOverrides, pickDims } from '../utils';

export const renderFollowersSparklineHandler: CardHandler = async ({
  config,
  query,
  card,
  ownerLogin,
  db,
  github,
}) => {
  const merged = applyQueryOverrides(config, query);
  const parsed = FollowersSparklineConfig.parse(merged);
  const user = await github.getUser(ownerLogin);
  if (!user) throw new HandlerError(404, 'GitHub user not found');
  // Lazy snapshot: idempotently insert today's count for this user.
  // First-ever view starts the history; subsequent views top it up daily.
  await snapshotFollowers(db, card.userId, user.followers);
  // Pull recent history within the requested period.
  const periodDays = followersDaysForPeriod(parsed.period);
  const sinceDay =
    parsed.period === 'all'
      ? undefined
      : new Date(Date.now() - periodDays * 86_400_000).toISOString().slice(0, 10);
  const history = await getFollowersHistory(db, card.userId, sinceDay);
  return renderFollowersSparkline(
    parsed,
    { login: ownerLogin, currentFollowers: user.followers, history },
    pickDims(parsed, query),
  );
};
