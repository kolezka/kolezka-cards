import { renderVisitCounter } from '@kc/shared/svg/visit-counter';
import { VisitCounterConfig } from '@kc/shared/zod/card-config';
import type { CardHandler } from '../handler-types';
import { applyQueryOverrides, pickDims } from '../utils';

export const renderVisitCounterHandler: CardHandler = async ({ config, query, visit }) => {
  const merged = applyQueryOverrides(config, query);
  const parsed = VisitCounterConfig.parse(merged);
  return renderVisitCounter(
    parsed,
    { totalImpressions: visit.totalImpressions, uniqueVisits: visit.uniqueVisits },
    pickDims(parsed, query),
  );
};
