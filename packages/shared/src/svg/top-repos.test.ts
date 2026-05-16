import { describe, expect, it } from 'bun:test';
import { TopReposConfig } from '../zod/card-config';
import { renderTopRepos } from './top-repos';

const repos = [
  {
    name: 'starlight',
    description: 'A small static site generator',
    language: 'TypeScript',
    stars: 1234,
    forks: 56,
    updatedAt: '2026-05-10T10:00:00Z',
  },
  {
    name: 'svelte-app',
    description: null,
    language: 'Svelte',
    stars: 80,
    forks: 4,
    updatedAt: '2026-05-12T10:00:00Z',
  },
  {
    name: 'rust-tool',
    description: 'cli',
    language: 'Rust',
    stars: 20,
    forks: 1,
    updatedAt: '2026-04-01T10:00:00Z',
  },
];

describe('renderTopRepos', () => {
  it('renders a well-formed SVG with title and rows', () => {
    const cfg = TopReposConfig.parse({ type: 'top-repos' });
    const svg = renderTopRepos(cfg, { login: 'octocat', repos });
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    expect(svg).toContain('top repos by stars');
    expect(svg).toContain('starlight');
    expect(svg).toContain('1.2k'); // compact stars
  });

  it('shows the sort variant in the default title', () => {
    const cfgForks = TopReposConfig.parse({ type: 'top-repos', sort: 'forks' });
    expect(renderTopRepos(cfgForks, { login: 'octocat', repos })).toContain('top repos by forks');

    const cfgUpdated = TopReposConfig.parse({ type: 'top-repos', sort: 'updated' });
    expect(renderTopRepos(cfgUpdated, { login: 'octocat', repos })).toContain('recently updated');
  });

  it('caps to the limit', () => {
    const cfg = TopReposConfig.parse({ type: 'top-repos', limit: 3 });
    const many = Array.from({ length: 10 }, (_, i) => ({
      name: `repo-${i}`,
      description: null,
      language: 'TypeScript',
      stars: 100 - i,
      forks: 1,
      updatedAt: null,
    }));
    const svg = renderTopRepos(cfg, { login: 'octocat', repos: many });
    expect(svg).toContain('repo-0');
    expect(svg).toContain('repo-2');
    expect(svg).not.toContain('repo-3');
  });

  it('uses language palette for the dot', () => {
    const cfg = TopReposConfig.parse({ type: 'top-repos' });
    const svg = renderTopRepos(cfg, { login: 'octocat', repos });
    expect(svg.toLowerCase()).toContain('#3178c6'); // TypeScript color
    expect(svg.toLowerCase()).toContain('#ff3e00'); // Svelte color
  });

  it('renders empty state when no repos', () => {
    const cfg = TopReposConfig.parse({ type: 'top-repos' });
    const svg = renderTopRepos(cfg, { login: 'octocat', repos: [] });
    expect(svg).toContain('No public repos');
  });

  it('handles null description without crashing', () => {
    const cfg = TopReposConfig.parse({ type: 'top-repos' });
    const svg = renderTopRepos(cfg, {
      login: 'octocat',
      repos: [
        {
          name: 'r',
          description: null,
          language: null,
          stars: 0,
          forks: 0,
          updatedAt: null,
        },
      ],
    });
    expect(svg).toContain('<svg ');
    expect(svg).toContain('>r<');
  });

  it('escapes a malicious title', () => {
    const cfg = TopReposConfig.parse({
      type: 'top-repos',
      title: '<img src=x onerror=alert(1)>',
    });
    const svg = renderTopRepos(cfg, { login: 'octocat', repos });
    expect(svg).not.toContain('<img');
    expect(svg).toContain('&lt;img');
  });

  it('respects custom width/height', () => {
    const cfg = TopReposConfig.parse({ type: 'top-repos' });
    const svg = renderTopRepos(cfg, { login: 'octocat', repos }, { width: 600, height: 300 });
    expect(svg).toContain('width="600"');
    expect(svg).toContain('height="300"');
  });

  it('truncates very long repo names with an ellipsis', () => {
    const cfg = TopReposConfig.parse({ type: 'top-repos' });
    const long = 'a'.repeat(120);
    const svg = renderTopRepos(cfg, {
      login: 'octocat',
      repos: [
        {
          name: long,
          description: null,
          language: 'TypeScript',
          stars: 1,
          forks: 0,
          updatedAt: null,
        },
      ],
    });
    expect(svg).toContain('…');
    expect(svg).not.toContain(long);
  });
});
