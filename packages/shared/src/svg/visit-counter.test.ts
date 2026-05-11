import { describe, expect, it } from 'bun:test';
import { VisitCounterConfig } from '../zod/card-config';
import { renderVisitCounter } from './visit-counter';

describe('renderVisitCounter', () => {
  const base = VisitCounterConfig.parse({ type: 'visit-counter', theme: 'github_dark' });

  it('returns a well-formed SVG string', () => {
    const svg = renderVisitCounter(base, { totalImpressions: 42, uniqueVisits: 7 });
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg.includes('xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
  });

  it('escapes a malicious title', () => {
    const cfg = VisitCounterConfig.parse({
      type: 'visit-counter',
      theme: 'github_dark',
      title: '</text><script>alert(1)</script>',
    });
    const svg = renderVisitCounter(cfg, { totalImpressions: 1, uniqueVisits: 1 });
    expect(svg.includes('<script>')).toBe(false);
    expect(svg.includes('&lt;script&gt;')).toBe(true);
  });

  it('formats large numbers compactly', () => {
    const svg = renderVisitCounter(base, { totalImpressions: 12_500, uniqueVisits: 1_200_000 });
    expect(svg.includes('12k') || svg.includes('13k')).toBe(true);
    expect(svg.includes('1.2M')).toBe(true);
  });

  it('honors the show.total/show.unique toggles', () => {
    const cfg = VisitCounterConfig.parse({
      type: 'visit-counter',
      theme: 'github_dark',
      show: { total: false, unique: true },
    });
    const svg = renderVisitCounter(cfg, { totalImpressions: 999, uniqueVisits: 42 });
    expect(svg.includes('Total impressions')).toBe(false);
    expect(svg.includes('Unique visits')).toBe(true);
  });

  it('applies theme overrides', () => {
    const cfg = VisitCounterConfig.parse({
      type: 'visit-counter',
      theme: 'github_dark',
      overrides: { accent: '#ff00aa' },
    });
    const svg = renderVisitCounter(cfg, { totalImpressions: 1, uniqueVisits: 1 });
    expect(svg.includes('#ff00aa')).toBe(true);
  });
});
