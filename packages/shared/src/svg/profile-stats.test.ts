import { describe, expect, it } from 'bun:test';
import { ProfileStatsConfig } from '../zod/card-config';
import { renderProfileStats } from './profile-stats';

const data = {
  login: 'octocat',
  publicRepos: 7,
  followers: 5000,
  following: 9,
  topLanguages: [
    { name: 'TypeScript', bytes: 8000 },
    { name: 'Svelte', bytes: 2000 },
  ],
};

describe('renderProfileStats', () => {
  it('renders a well-formed SVG', () => {
    const cfg = ProfileStatsConfig.parse({ type: 'profile-stats', theme: 'github_dark' });
    const svg = renderProfileStats(cfg, data);
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    expect(svg.includes('5k')).toBe(true);
  });

  it('escapes a malicious custom title', () => {
    const cfg = ProfileStatsConfig.parse({
      type: 'profile-stats',
      theme: 'github_dark',
      title: '<img src=x onerror=alert(1)>',
    });
    const svg = renderProfileStats(cfg, data);
    expect(svg.includes('<img')).toBe(false);
    expect(svg.includes('&lt;img')).toBe(true);
  });

  it('escapes login when used in the default title', () => {
    const cfg = ProfileStatsConfig.parse({ type: 'profile-stats', theme: 'github_dark' });
    const svg = renderProfileStats(cfg, { ...data, login: '</text><script>' });
    expect(svg.includes('<script>')).toBe(false);
    expect(svg.includes('&lt;script&gt;')).toBe(true);
  });

  it('omits language bar when show.languages is false', () => {
    const cfg = ProfileStatsConfig.parse({
      type: 'profile-stats',
      theme: 'github_dark',
      show: { languages: false, commitGraph: false },
    });
    const svg = renderProfileStats(cfg, data);
    expect(svg.includes('TypeScript')).toBe(false);
  });

  it('applies theme overrides', () => {
    const cfg = ProfileStatsConfig.parse({
      type: 'profile-stats',
      theme: 'github_dark',
      overrides: { accent: '#ff00aa' },
    });
    const svg = renderProfileStats(cfg, data);
    expect(svg.includes('#ff00aa')).toBe(true);
  });
});
