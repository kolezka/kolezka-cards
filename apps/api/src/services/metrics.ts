export type CounterTags = Record<string, string | number>;

export interface MetricsSnapshot {
  startedAt: string;
  uptimeSec: number;
  rssBytes: number;
  counters: Record<string, number>;
}

export interface MetricsInstance {
  bump(name: string, delta?: number, tags?: CounterTags): void;
  snapshot(): MetricsSnapshot;
  reset(): void;
}

function keyOf(name: string, tags?: CounterTags): string {
  if (!tags) return name;
  const parts = Object.entries(tags)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`);
  return parts.length === 0 ? name : `${name}{${parts.join(',')}}`;
}

export function createMetrics(): MetricsInstance {
  const counters = new Map<string, number>();
  const startedAt = new Date();
  return {
    bump(name, delta, tags) {
      const inc = delta ?? 1;
      const key = keyOf(name, tags);
      counters.set(key, (counters.get(key) ?? 0) + inc);
    },
    snapshot() {
      const rssBytes = (() => {
        try {
          return process.memoryUsage().rss;
        } catch {
          return 0;
        }
      })();
      return {
        startedAt: startedAt.toISOString(),
        uptimeSec: Math.round((Date.now() - startedAt.getTime()) / 1000),
        rssBytes,
        counters: Object.fromEntries(counters),
      };
    },
    reset() {
      counters.clear();
    },
  };
}

const global = createMetrics();

export function bumpCounter(name: string, delta = 1, tags?: CounterTags): void {
  global.bump(name, delta, tags);
}

export function snapshotMetrics(): MetricsSnapshot {
  return global.snapshot();
}

export function resetMetrics(): void {
  global.reset();
}
