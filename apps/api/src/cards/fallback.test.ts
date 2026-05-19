import { describe, expect, it } from 'bun:test';
import { renderFallback } from './fallback';

describe('renderFallback', () => {
  it('produces a valid SVG with the card title', () => {
    const svg = renderFallback({ theme: 'github_dark', title: 'My visits' }, 'visit-counter');
    expect(svg).toStartWith('<svg');
    expect(svg).toContain('aria-label="My visits (data unavailable)"');
    expect(svg).toContain('My visits');
    expect(svg).toContain('GitHub data temporarily unavailable');
  });

  it('falls back to the card type when no title is set', () => {
    const svg = renderFallback({ theme: 'github_dark' }, 'profile-summary');
    expect(svg).toContain('>profile-summary<');
  });

  it('respects the configured size', () => {
    const svg = renderFallback(
      { theme: 'github_dark', size: { width: 720, height: 240 } },
      'repo-stats',
    );
    expect(svg).toContain('width="720"');
    expect(svg).toContain('height="240"');
    expect(svg).toContain('viewBox="0 0 720 240"');
  });

  it('applies theme overrides to fills/strokes', () => {
    const svg = renderFallback(
      { theme: 'github_dark', overrides: { background: '#101820' } },
      'visit-counter',
    );
    expect(svg).toContain('#101820');
  });

  it('escapes user-provided titles so XML stays well-formed', () => {
    const svg = renderFallback(
      { theme: 'github_dark', title: '<script>alert(1)</script>' },
      'visit-counter',
    );
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
  });

  it('tags the SVG with data-fallback for downstream detection', () => {
    const svg = renderFallback({ theme: 'github_dark' }, 'profile-stats');
    expect(svg).toContain('data-fallback="github-unavailable"');
  });
});
