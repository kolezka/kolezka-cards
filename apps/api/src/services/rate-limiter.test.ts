import { describe, expect, it } from 'bun:test';
import { createTokenBucket } from './rate-limiter';

describe('TokenBucket', () => {
  it('allows requests under the limit', () => {
    const b = createTokenBucket({ capacity: 5, refillPerMs: 5 / 1000, now: () => 0 });
    for (let i = 0; i < 5; i++) {
      expect(b.tryTake('k')).toEqual({ ok: true, retryAfterMs: 0 });
    }
  });

  it('rejects when capacity exhausted', () => {
    const b = createTokenBucket({ capacity: 3, refillPerMs: 3 / 1000, now: () => 0 });
    b.tryTake('k');
    b.tryTake('k');
    b.tryTake('k');
    const fourth = b.tryTake('k');
    expect(fourth.ok).toBe(false);
    expect(fourth.retryAfterMs).toBeGreaterThan(0);
  });

  it('refills over time', () => {
    let t = 0;
    const b = createTokenBucket({ capacity: 2, refillPerMs: 1 / 1000, now: () => t });
    b.tryTake('k');
    b.tryTake('k');
    expect(b.tryTake('k').ok).toBe(false);
    t = 1100;
    expect(b.tryTake('k').ok).toBe(true);
  });

  it('isolates buckets per key', () => {
    const b = createTokenBucket({ capacity: 1, refillPerMs: 1 / 1000, now: () => 0 });
    expect(b.tryTake('a').ok).toBe(true);
    expect(b.tryTake('a').ok).toBe(false);
    expect(b.tryTake('b').ok).toBe(true);
  });

  it('sweep drops idle buckets', () => {
    let t = 0;
    const b = createTokenBucket({
      capacity: 2,
      refillPerMs: 2 / 1000,
      idleEvictMs: 1000,
      now: () => t,
    });
    b.tryTake('a');
    expect(b.size()).toBe(1);
    t = 2000;
    b.sweep();
    expect(b.size()).toBe(0);
  });
});
