import { type DB, schema } from '@kc/db';
import { and, eq, gte, sql } from 'drizzle-orm';

export const ANALYTICS_RANGES = ['24h', '7d', '30d', 'all'] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

const HOUR_MS = 60 * 60 * 1000;

export function parseRange(input: string | undefined): AnalyticsRange {
  if (input && (ANALYTICS_RANGES as readonly string[]).includes(input)) {
    return input as AnalyticsRange;
  }
  return '7d';
}

function rangeStartMs(range: AnalyticsRange, now: Date): number {
  switch (range) {
    case '24h':
      return now.getTime() - 24 * 60 * 60 * 1000;
    case '7d':
      return now.getTime() - 7 * 24 * 60 * 60 * 1000;
    case '30d':
      return now.getTime() - 30 * 24 * 60 * 60 * 1000;
    case 'all':
      return 0;
  }
}

export interface SeriesPoint {
  hourBucket: number;
  totalImpressions: number;
  uniqueVisits: number;
}

export interface Breakdown<TKey extends string | null> {
  count: number;
}

export interface AnalyticsResult {
  range: AnalyticsRange;
  totals: { totalImpressions: number; uniqueVisits: number };
  series: SeriesPoint[];
  referrers: Array<{ host: string | null; count: number }>;
  countries: Array<{ country: string | null; count: number }>;
  userAgents: Array<{ family: string | null; count: number }>;
  /**
   * Hour-of-week × hour-of-day heatmap. 7 rows (UTC Sun=0..Sat=6) × 24 cols.
   * Always returns a fully-populated 7x24 grid; zero-filled when no visits.
   */
  heatmap: number[][];
}

export interface QueryAnalyticsInput {
  cardId: string;
  range?: AnalyticsRange;
  now?: Date;
}

export function queryAnalytics(db: DB, input: QueryAnalyticsInput): AnalyticsResult {
  const now = input.now ?? new Date();
  const range = input.range ?? '7d';
  const startMs = rangeStartMs(range, now);
  const startHour = Math.floor(startMs / HOUR_MS);

  const seriesRows = db
    .select({
      hourBucket: schema.impressionBuckets.hourBucket,
      totalImpressions: schema.impressionBuckets.totalImpressions,
      uniqueVisits: schema.impressionBuckets.uniqueVisits,
    })
    .from(schema.impressionBuckets)
    .where(
      and(
        eq(schema.impressionBuckets.cardId, input.cardId),
        gte(schema.impressionBuckets.hourBucket, startHour),
      ),
    )
    .all();

  const totals = seriesRows.reduce(
    (acc, r) => ({
      totalImpressions: acc.totalImpressions + r.totalImpressions,
      uniqueVisits: acc.uniqueVisits + r.uniqueVisits,
    }),
    { totalImpressions: 0, uniqueVisits: 0 },
  );

  const visitWhere =
    range === 'all'
      ? eq(schema.visits.cardId, input.cardId)
      : and(
          eq(schema.visits.cardId, input.cardId),
          gte(schema.visits.createdAt, new Date(startMs)),
        );

  const referrers = db
    .select({
      host: schema.visits.referrerHost,
      count: sql<number>`count(*)`,
    })
    .from(schema.visits)
    .where(visitWhere)
    .groupBy(schema.visits.referrerHost)
    .all()
    .map((r) => ({ host: r.host, count: Number(r.count) }))
    .sort((a, b) => b.count - a.count);

  const countries = db
    .select({
      country: schema.visits.country,
      count: sql<number>`count(*)`,
    })
    .from(schema.visits)
    .where(visitWhere)
    .groupBy(schema.visits.country)
    .all()
    .map((r) => ({ country: r.country, count: Number(r.count) }))
    .sort((a, b) => b.count - a.count);

  const userAgents = db
    .select({
      family: schema.visits.userAgentFamily,
      count: sql<number>`count(*)`,
    })
    .from(schema.visits)
    .where(visitWhere)
    .groupBy(schema.visits.userAgentFamily)
    .all()
    .map((r) => ({ family: r.family, count: Number(r.count) }))
    .sort((a, b) => b.count - a.count);

  const dowExpr = sql<number>`CAST(strftime('%w', ${schema.visits.createdAt} / 1000, 'unixepoch') AS INTEGER)`;
  const hourExpr = sql<number>`CAST(strftime('%H', ${schema.visits.createdAt} / 1000, 'unixepoch') AS INTEGER)`;
  const heatmapRows = db
    .select({
      dow: dowExpr,
      hour: hourExpr,
      count: sql<number>`count(*)`,
    })
    .from(schema.visits)
    .where(visitWhere)
    .groupBy(dowExpr, hourExpr)
    .all();
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const r of heatmapRows) {
    const d = Number(r.dow);
    const h = Number(r.hour);
    if (d >= 0 && d < 7 && h >= 0 && h < 24) {
      heatmap[d]![h] = Number(r.count);
    }
  }

  return {
    range,
    totals,
    series: seriesRows
      .map((r) => ({
        hourBucket: r.hourBucket,
        totalImpressions: r.totalImpressions,
        uniqueVisits: r.uniqueVisits,
      }))
      .sort((a, b) => a.hourBucket - b.hourBucket),
    referrers,
    countries,
    userAgents,
    heatmap,
  };
}
