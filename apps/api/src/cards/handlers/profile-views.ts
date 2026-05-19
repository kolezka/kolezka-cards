import { renderProfileViews } from '@kc/shared/svg/profile-views';
import { ProfileViewsConfig } from '@kc/shared/zod/card-config';
import type { CardHandler } from '../handler-types';
import { applyQueryOverrides, pickDims } from '../utils';

export const renderProfileViewsHandler: CardHandler = async ({ config, query, visit }) => {
  const merged = applyQueryOverrides(config, query);
  const parsed = ProfileViewsConfig.parse(merged);
  const views = parsed.metric === 'unique' ? visit.uniqueVisits : visit.totalImpressions;
  return renderProfileViews(parsed, { views }, pickDims(parsed, query));
};
