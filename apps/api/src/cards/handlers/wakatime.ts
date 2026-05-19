import { renderWakatime } from '@kc/shared/svg/wakatime';
import { WakatimeConfig } from '@kc/shared/zod/card-config';
import { logger } from '../../logger';
import type { CardHandler } from '../handler-types';
import { applyQueryOverrides, pickDims } from '../utils';

export const renderWakatimeHandler: CardHandler = async ({ config, query, card, ownerLogin }) => {
  const merged = applyQueryOverrides(config, query);
  const parsed = WakatimeConfig.parse(merged);
  // No (or stub) API key → render empty state without ever contacting
  // Wakatime. min length 20 is the floor for a plausibly-real token.
  if (!parsed.apiKey || parsed.apiKey.length < 20) {
    return renderWakatime(
      parsed,
      { login: ownerLogin, totalSeconds: 0, languages: [] },
      pickDims(parsed, query),
    );
  }
  // Wakatime "stats" endpoint provides aggregated language breakdown for
  // the chosen range with grand_total. https://wakatime.com/developers
  const url = `https://wakatime.com/api/v1/users/current/stats/${encodeURIComponent(parsed.range)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${btoa(parsed.apiKey)}`,
      Accept: 'application/json',
      'User-Agent': 'kolezka-cards',
    },
  });
  if (!res.ok) {
    logger.warn(
      { cardId: card.id, status: res.status },
      'wakatime fetch failed; rendering empty state',
    );
    return renderWakatime(
      parsed,
      { login: ownerLogin, totalSeconds: 0, languages: [] },
      pickDims(parsed, query),
    );
  }
  const body = (await res.json()) as {
    data?: {
      total_seconds?: number;
      languages?: Array<{ name: string; total_seconds: number; percent: number }>;
    };
  };
  const total = body.data?.total_seconds ?? 0;
  const langs = (body.data?.languages ?? []).map((l) => ({
    name: l.name,
    seconds: l.total_seconds,
    percent: l.percent,
  }));
  return renderWakatime(
    parsed,
    { login: ownerLogin, totalSeconds: total, languages: langs },
    pickDims(parsed, query),
  );
};
