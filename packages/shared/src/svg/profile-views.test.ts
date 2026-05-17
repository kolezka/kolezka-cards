import { describe, expect, it } from 'bun:test';
import { ProfileViewsConfig } from '../zod/card-config';
import { renderProfileViews } from './profile-views';

describe('renderProfileViews', () => {
  it('renders a well-formed SVG with the default Profile views label', () => {
    const cfg = ProfileViewsConfig.parse({ type: 'profile-views' });
    const svg = renderProfileViews(cfg, { views: 1234 });
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    expect(svg).toContain('Profile views');
    expect(svg).toContain('1.2k');
  });

  it('defaults to a compact 220x40 size', () => {
    const cfg = ProfileViewsConfig.parse({ type: 'profile-views' });
    const svg = renderProfileViews(cfg, { views: 1 });
    expect(svg).toContain('width="220"');
    expect(svg).toContain('height="40"');
    expect(svg).toContain('viewBox="0 0 220 40"');
  });

  it('respects an explicit custom width / height', () => {
    const cfg = ProfileViewsConfig.parse({ type: 'profile-views' });
    const svg = renderProfileViews(cfg, { views: 99 }, { width: 320, height: 48 });
    expect(svg).toContain('width="320"');
    expect(svg).toContain('height="48"');
  });

  it('uses config.title to override the label', () => {
    const cfg = ProfileViewsConfig.parse({
      type: 'profile-views',
      title: 'README hits',
    });
    const svg = renderProfileViews(cfg, { views: 7 });
    expect(svg).toContain('README hits');
    expect(svg).not.toContain('Profile views');
  });

  it('escapes a malicious title', () => {
    const cfg = ProfileViewsConfig.parse({
      type: 'profile-views',
      title: '<img src=x onerror=alert(1)>',
    });
    const svg = renderProfileViews(cfg, { views: 1 });
    expect(svg).not.toContain('<img');
    expect(svg).toContain('&lt;img');
  });

  it('formats small numbers verbatim', () => {
    const cfg = ProfileViewsConfig.parse({ type: 'profile-views' });
    expect(renderProfileViews(cfg, { views: 42 })).toContain('>42<');
  });

  it('compacts large numbers (k / M)', () => {
    const cfg = ProfileViewsConfig.parse({ type: 'profile-views' });
    const svg12k = renderProfileViews(cfg, { views: 12_500 });
    // compact() rounds for ≥10k, so the 0.5 boundary may land on 12 or 13
    expect(svg12k.includes('12k') || svg12k.includes('13k')).toBe(true);
    expect(renderProfileViews(cfg, { views: 1_300_000 })).toContain('1.3M');
  });

  it('uses theme accent for the value text', () => {
    const cfg = ProfileViewsConfig.parse({ type: 'profile-views', theme: 'github_dark' });
    const svg = renderProfileViews(cfg, { views: 1 });
    // github_dark accent is #58a6ff
    expect(svg.toLowerCase()).toContain('#58a6ff');
  });

  it('parses through the discriminated CardConfig union', () => {
    const cfg = ProfileViewsConfig.parse({ type: 'profile-views', metric: 'unique' });
    expect(cfg.metric).toBe('unique');
    expect(cfg.type).toBe('profile-views');
  });

  it("defaults metric to 'total'", () => {
    const cfg = ProfileViewsConfig.parse({ type: 'profile-views' });
    expect(cfg.metric).toBe('total');
  });

  it('rejects unknown metric values', () => {
    const r = ProfileViewsConfig.safeParse({ type: 'profile-views', metric: 'something-else' });
    expect(r.success).toBe(false);
  });
});
