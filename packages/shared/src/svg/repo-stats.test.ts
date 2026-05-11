import { describe, expect, it } from 'bun:test';
import { RepoStatsConfig } from '../zod/card-config';
import { renderRepoStats } from './repo-stats';

const data = {
  owner: 'octocat',
  name: 'hello',
  stars: 1234,
  forks: 56,
  primaryLanguage: 'TypeScript',
  languages: [
    { name: 'TypeScript', bytes: 8000 },
    { name: 'CSS', bytes: 1000 },
  ],
};

describe('renderRepoStats', () => {
  it('renders a well-formed SVG with stars + forks', () => {
    const cfg = RepoStatsConfig.parse({
      type: 'repo-stats',
      theme: 'github_dark',
      repo: 'octocat/hello',
    });
    const svg = renderRepoStats(cfg, data);
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    expect(svg.includes('1.2k')).toBe(true);
    expect(svg.includes('56')).toBe(true);
    expect(svg.includes('TypeScript')).toBe(true);
  });

  it('escapes malicious owner/name', () => {
    const cfg = RepoStatsConfig.parse({
      type: 'repo-stats',
      theme: 'github_dark',
      repo: 'octocat/hello',
    });
    const svg = renderRepoStats(cfg, { ...data, owner: '<script>', name: 'x"' });
    expect(svg.includes('<script>')).toBe(false);
  });

  it('handles empty language map', () => {
    const cfg = RepoStatsConfig.parse({
      type: 'repo-stats',
      theme: 'github_dark',
      repo: 'octocat/hello',
    });
    const svg = renderRepoStats(cfg, { ...data, languages: [] });
    expect(svg.includes('<svg')).toBe(true);
  });
});
