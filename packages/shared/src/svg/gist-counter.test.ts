import { describe, expect, it } from 'bun:test';
import { GistCounterConfig } from '../zod/card-config';
import { renderGistCounter } from './gist-counter';

const data = {
  login: 'octocat',
  publicGists: 42,
  latestGist: { description: 'A handy snippet', updatedAt: '2026-05-15T10:00:00Z' },
};

describe('renderGistCounter', () => {
  it('renders a well-formed SVG with count and latest title', () => {
    const cfg = GistCounterConfig.parse({ type: 'gist-counter' });
    const svg = renderGistCounter(cfg, data);
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    expect(svg).toContain('42');
    expect(svg).toContain('Public gists');
    expect(svg).toContain('A handy snippet');
  });

  it('falls back to "Untitled gist" when latest has no description', () => {
    const cfg = GistCounterConfig.parse({ type: 'gist-counter' });
    const svg = renderGistCounter(cfg, {
      ...data,
      latestGist: { description: null, updatedAt: '2026-05-15T10:00:00Z' },
    });
    expect(svg).toContain('Untitled gist');
  });

  it('omits count when show.count is false', () => {
    const cfg = GistCounterConfig.parse({
      type: 'gist-counter',
      show: { count: false, latest: true },
    });
    const svg = renderGistCounter(cfg, data);
    expect(svg).not.toContain('Public gists');
  });

  it('omits latest when show.latest is false', () => {
    const cfg = GistCounterConfig.parse({
      type: 'gist-counter',
      show: { count: true, latest: false },
    });
    const svg = renderGistCounter(cfg, data);
    expect(svg).not.toContain('Latest');
  });

  it('omits latest when latestGist is null', () => {
    const cfg = GistCounterConfig.parse({ type: 'gist-counter' });
    const svg = renderGistCounter(cfg, { ...data, latestGist: null });
    expect(svg).not.toContain('Latest');
    expect(svg).toContain('Public gists');
  });

  it('compacts large counts', () => {
    const cfg = GistCounterConfig.parse({ type: 'gist-counter' });
    const svg = renderGistCounter(cfg, { ...data, publicGists: 12_500 });
    // compact() rounds to nearest integer for >=10k
    expect(svg.includes('12k') || svg.includes('13k')).toBe(true);
  });

  it('escapes malicious description', () => {
    const cfg = GistCounterConfig.parse({ type: 'gist-counter' });
    const svg = renderGistCounter(cfg, {
      ...data,
      latestGist: { description: '<script>alert(1)</script>', updatedAt: null },
    });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('escapes malicious title', () => {
    const cfg = GistCounterConfig.parse({
      type: 'gist-counter',
      title: '<img src=x>',
    });
    const svg = renderGistCounter(cfg, data);
    expect(svg).not.toContain('<img');
  });

  it('respects custom dims', () => {
    const cfg = GistCounterConfig.parse({ type: 'gist-counter' });
    const svg = renderGistCounter(cfg, data, { width: 600, height: 180 });
    expect(svg).toContain('width="600"');
    expect(svg).toContain('height="180"');
  });
});
