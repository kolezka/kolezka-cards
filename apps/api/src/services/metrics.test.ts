import { beforeEach, describe, expect, it } from 'bun:test';
import { bumpCounter, createMetrics, resetMetrics, snapshotMetrics } from './metrics';

beforeEach(() => resetMetrics());

describe('metrics', () => {
  it('increments counters', () => {
    bumpCounter('render.total');
    bumpCounter('render.total');
    bumpCounter('render.total', 3);
    const snap = snapshotMetrics();
    expect(snap.counters['render.total']).toBe(5);
  });

  it('reports tag dimensions in dot-separated key', () => {
    bumpCounter('render.by_type', 1, { type: 'visit-counter' });
    bumpCounter('render.by_type', 1, { type: 'visit-counter' });
    bumpCounter('render.by_type', 1, { type: 'profile-stats' });
    const snap = snapshotMetrics();
    expect(snap.counters['render.by_type{type=visit-counter}']).toBe(2);
    expect(snap.counters['render.by_type{type=profile-stats}']).toBe(1);
  });

  it('createMetrics produces an isolated instance', () => {
    const m = createMetrics();
    m.bump('isolated');
    expect(m.snapshot().counters.isolated).toBe(1);
    const global = snapshotMetrics();
    expect(global.counters.isolated).toBeUndefined();
  });

  it('snapshot includes process uptime and rss', () => {
    const snap = snapshotMetrics();
    expect(typeof snap.uptimeSec).toBe('number');
    expect(snap.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(typeof snap.rssBytes).toBe('number');
  });
});
