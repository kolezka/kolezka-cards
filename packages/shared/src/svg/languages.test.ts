import { describe, expect, it } from 'bun:test';
import { LanguagesConfig } from '../zod/card-config';
import { renderLanguages } from './languages';

const data = {
  login: 'octocat',
  languages: [
    { name: 'TypeScript', bytes: 6000 },
    { name: 'Svelte', bytes: 2000 },
    { name: 'CSS', bytes: 1500 },
    { name: 'Shell', bytes: 500 },
  ],
};

describe('renderLanguages', () => {
  it('renders a well-formed SVG (bar style default)', () => {
    const cfg = LanguagesConfig.parse({ type: 'languages' });
    const svg = renderLanguages(cfg, data);
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg.trim().endsWith('</svg>')).toBe(true);
    expect(svg).toContain('octocat&apos;s top languages');
  });

  it('uses TypeScript color in the bar', () => {
    const cfg = LanguagesConfig.parse({ type: 'languages' });
    const svg = renderLanguages(cfg, data);
    expect(svg.toLowerCase()).toContain('#3178c6');
  });

  it('caps to `limit` entries', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      name: `Lang${i}`,
      bytes: 100 - i,
    }));
    const cfg = LanguagesConfig.parse({ type: 'languages', limit: 5 });
    const svg = renderLanguages(cfg, { login: 'octocat', languages: many });
    // Only top 5 should appear in legend text
    expect(svg).toContain('Lang0');
    expect(svg).toContain('Lang4');
    expect(svg).not.toContain('Lang5');
  });

  it('renders donut style with arcs and center label', () => {
    const cfg = LanguagesConfig.parse({ type: 'languages', style: 'donut' });
    const svg = renderLanguages(cfg, data);
    expect(svg).toContain('<path');
    expect(svg).toContain('TypeScript'); // legend or center label
  });

  it('shows percentages in legend (one decimal)', () => {
    const cfg = LanguagesConfig.parse({ type: 'languages' });
    const svg = renderLanguages(cfg, {
      login: 'octocat',
      languages: [
        { name: 'A', bytes: 50 },
        { name: 'B', bytes: 50 },
      ],
    });
    expect(svg).toContain('50.0%');
  });

  it('renders empty state when no languages', () => {
    const cfg = LanguagesConfig.parse({ type: 'languages' });
    const svg = renderLanguages(cfg, { login: 'octocat', languages: [] });
    expect(svg).toContain('No language data');
  });

  it('handles a single language without crashing (donut full circle)', () => {
    const cfg = LanguagesConfig.parse({ type: 'languages', style: 'donut' });
    const svg = renderLanguages(cfg, {
      login: 'octocat',
      languages: [{ name: 'TypeScript', bytes: 1000 }],
    });
    expect(svg).toContain('<svg ');
    expect(svg).toContain('TypeScript');
  });

  it('escapes a malicious title', () => {
    const cfg = LanguagesConfig.parse({
      type: 'languages',
      title: '<img src=x onerror=alert(1)>',
    });
    const svg = renderLanguages(cfg, data);
    expect(svg).not.toContain('<img');
    expect(svg).toContain('&lt;img');
  });

  it('respects custom width/height', () => {
    const cfg = LanguagesConfig.parse({ type: 'languages' });
    const svg = renderLanguages(cfg, data, { width: 600, height: 280 });
    expect(svg).toContain('width="600"');
    expect(svg).toContain('height="280"');
  });
});
