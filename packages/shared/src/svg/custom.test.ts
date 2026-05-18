import { describe, expect, it } from 'bun:test';
import { CustomConfig } from '../zod/card-config';
import { type CustomData, neededSources, renderCustom } from './custom';

function parse(raw: unknown): ReturnType<typeof CustomConfig.parse> {
  return CustomConfig.parse(raw);
}

const baseCfg = {
  type: 'custom' as const,
  theme: 'github_dark',
  title: 'Test',
  size: { width: 480, height: 300 },
  blocks: [],
};

describe('CustomConfig schema', () => {
  it('parses a minimal valid layout', () => {
    const c = parse({ ...baseCfg, blocks: [] });
    expect(c.type).toBe('custom');
    expect(c.blocks).toEqual([]);
  });

  it('rejects unknown block kind', () => {
    expect(() =>
      parse({
        ...baseCfg,
        blocks: [{ id: 'a', kind: 'mystery', x: 0, y: 0, w: 100, h: 32 }],
      }),
    ).toThrow();
  });

  it('rejects out-of-range coordinates', () => {
    expect(() =>
      parse({
        ...baseCfg,
        blocks: [{ id: 'a', kind: 'divider', x: -1, y: 0, w: 100, h: 8 }],
      }),
    ).toThrow();
  });

  it('caps blocks array length', () => {
    const blocks = Array.from({ length: 51 }, (_, i) => ({
      id: `b${i}`,
      kind: 'divider' as const,
      x: 0,
      y: 0,
      w: 100,
      h: 8,
    }));
    expect(() => parse({ ...baseCfg, blocks })).toThrow();
  });

  it('applies defaults on text block', () => {
    const c = parse({
      ...baseCfg,
      blocks: [{ id: 'a', kind: 'text', x: 0, y: 0, w: 200, h: 32, text: 'hi' }],
    });
    const t = c.blocks[0];
    if (!t || t.kind !== 'text') throw new Error('expected text block');
    expect(t.size).toBe('m');
    expect(t.align).toBe('left');
    expect(t.color).toBe('text');
    expect(t.weight).toBe('normal');
  });
});

describe('renderCustom', () => {
  it('emits an outer <svg> with the configured size', () => {
    const cfg = parse({ ...baseCfg, blocks: [] });
    const svg = renderCustom(cfg, {}, { width: 480, height: 300 });
    expect(svg).toContain('<svg ');
    expect(svg).toContain('width="480"');
    expect(svg).toContain('height="300"');
    expect(svg).toContain('viewBox="0 0 480 300"');
  });

  it('renders a text block with its literal text escaped', () => {
    const cfg = parse({
      ...baseCfg,
      blocks: [
        {
          id: 'a',
          kind: 'text',
          x: 16,
          y: 16,
          w: 200,
          h: 32,
          text: 'hello & <world>',
          weight: 'bold',
        },
      ],
    });
    const svg = renderCustom(cfg, {}, {});
    expect(svg).toContain('hello &amp; &lt;world&gt;');
    expect(svg).toContain('font-weight="700"');
  });

  it('resolves visits.total from the provided data', () => {
    const cfg = parse({
      ...baseCfg,
      blocks: [
        {
          id: 'a',
          kind: 'stat',
          x: 16,
          y: 16,
          w: 144,
          h: 80,
          label: 'impressions',
          source: 'visits.total',
        },
      ],
    });
    const data: CustomData = { visits: { total: 1234, unique: 100 } };
    const svg = renderCustom(cfg, data, {});
    expect(svg).toContain('1.2k');
    expect(svg).toContain('impressions');
  });

  it('shows the placeholder when a github source has no data', () => {
    const cfg = parse({
      ...baseCfg,
      blocks: [
        {
          id: 'a',
          kind: 'stat',
          x: 16,
          y: 16,
          w: 144,
          h: 80,
          label: 'stars',
          source: 'github.stars',
        },
      ],
    });
    const svg = renderCustom(cfg, {}, {});
    expect(svg).toContain('—');
  });

  it('renders a badge with literal value', () => {
    const cfg = parse({
      ...baseCfg,
      blocks: [
        {
          id: 'a',
          kind: 'badge',
          x: 16,
          y: 16,
          w: 144,
          h: 24,
          label: 'status',
          source: 'literal',
          literal: 'ok',
        },
      ],
    });
    const svg = renderCustom(cfg, {}, {});
    expect(svg).toContain('status');
    expect(svg).toContain('ok');
  });

  it('renders a sparkline with followers history', () => {
    const cfg = parse({
      ...baseCfg,
      blocks: [
        {
          id: 'a',
          kind: 'sparkline',
          x: 16,
          y: 16,
          w: 240,
          h: 96,
          source: 'followers',
          period: '90d',
        },
      ],
    });
    const data: CustomData = {
      followersHistory: Array.from({ length: 10 }, (_, i) => {
        const day = new Date(Date.now() - (9 - i) * 86_400_000).toISOString().slice(0, 10);
        return { day, followers: 100 + i };
      }),
    };
    const svg = renderCustom(cfg, data, {});
    expect(svg).toContain('<path d="M ');
    expect(svg).toContain('fill="url(#cc-fill)"');
  });

  it('renders an image block with the src', () => {
    const cfg = parse({
      ...baseCfg,
      blocks: [
        {
          id: 'a',
          kind: 'image',
          x: 0,
          y: 0,
          w: 64,
          h: 64,
          src: 'https://example.com/x.png',
          alt: 'x',
        },
      ],
    });
    const svg = renderCustom(cfg, {}, {});
    expect(svg).toContain('<image');
    expect(svg).toContain('https://example.com/x.png');
  });

  it('skips an empty image block (no src)', () => {
    const cfg = parse({
      ...baseCfg,
      blocks: [{ id: 'a', kind: 'image', x: 0, y: 0, w: 64, h: 64, src: '', alt: '' }],
    });
    const svg = renderCustom(cfg, {}, {});
    expect(svg).not.toContain('<image');
  });
});

describe('neededSources', () => {
  it('returns all-false for an empty layout', () => {
    const cfg = parse({ ...baseCfg, blocks: [] });
    expect(neededSources(cfg)).toEqual({
      needsGithubUser: false,
      needsGithubRepos: false,
      needsContributions: false,
      needsFollowersHistory: false,
    });
  });

  it('flags github user + repos for a github.stars stat', () => {
    const cfg = parse({
      ...baseCfg,
      blocks: [
        {
          id: 'a',
          kind: 'stat',
          x: 0,
          y: 0,
          w: 100,
          h: 80,
          source: 'github.stars',
        },
      ],
    });
    const n = neededSources(cfg);
    expect(n.needsGithubUser).toBe(true);
    expect(n.needsGithubRepos).toBe(true);
    expect(n.needsContributions).toBe(false);
  });

  it('flags contributions for a contributions sparkline', () => {
    const cfg = parse({
      ...baseCfg,
      blocks: [
        {
          id: 'a',
          kind: 'sparkline',
          x: 0,
          y: 0,
          w: 240,
          h: 96,
          source: 'contributions',
          period: '90d',
        },
      ],
    });
    expect(neededSources(cfg).needsContributions).toBe(true);
  });

  it('flags followers history for a followers sparkline', () => {
    const cfg = parse({
      ...baseCfg,
      blocks: [
        {
          id: 'a',
          kind: 'sparkline',
          x: 0,
          y: 0,
          w: 240,
          h: 96,
          source: 'followers',
          period: '30d',
        },
      ],
    });
    expect(neededSources(cfg).needsFollowersHistory).toBe(true);
  });
});
