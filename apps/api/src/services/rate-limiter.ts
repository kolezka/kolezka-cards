export interface TokenBucketOptions {
  capacity: number;
  refillPerMs: number;
  idleEvictMs?: number;
  now?: () => number;
}

export interface TakeResult {
  ok: boolean;
  retryAfterMs: number;
}

interface BucketState {
  tokens: number;
  lastRefill: number;
}

export interface TokenBucket {
  tryTake(key: string): TakeResult;
  sweep(): void;
  size(): number;
}

export function createTokenBucket(opts: TokenBucketOptions): TokenBucket {
  const buckets = new Map<string, BucketState>();
  const idleEvictMs = opts.idleEvictMs ?? 5 * 60 * 1000;
  const now = opts.now ?? Date.now;

  function refill(state: BucketState, t: number): void {
    const dt = t - state.lastRefill;
    if (dt <= 0) return;
    state.tokens = Math.min(opts.capacity, state.tokens + dt * opts.refillPerMs);
    state.lastRefill = t;
  }

  return {
    tryTake(key: string): TakeResult {
      const t = now();
      let state = buckets.get(key);
      if (!state) {
        state = { tokens: opts.capacity, lastRefill: t };
        buckets.set(key, state);
      } else {
        refill(state, t);
      }
      if (state.tokens >= 1) {
        state.tokens -= 1;
        return { ok: true, retryAfterMs: 0 };
      }
      const missing = 1 - state.tokens;
      const retryAfterMs = Math.ceil(missing / opts.refillPerMs);
      return { ok: false, retryAfterMs };
    },
    sweep(): void {
      const t = now();
      for (const [k, s] of buckets) {
        if (t - s.lastRefill <= idleEvictMs) continue;
        refill(s, t);
        if (s.tokens >= opts.capacity) buckets.delete(k);
      }
    },
    size(): number {
      return buckets.size;
    },
  };
}
