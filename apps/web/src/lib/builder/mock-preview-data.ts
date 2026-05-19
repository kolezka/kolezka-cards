import type { CustomData } from '@kc/shared/svg/custom';

// Mock data for the live preview. The numbers don't match production, but
// the rendering / layout / theme are identical because this is the real
// renderer from @kc/shared.
export const MOCK_PREVIEW: CustomData = {
  visits: { total: 1234, unique: 567 },
  github: {
    stars: 89,
    followers: 421,
    repos: 32,
    gists: 5,
    contributionsYear: 1842,
    topLanguage: 'TypeScript',
  },
  followersHistory: Array.from({ length: 90 }, (_, i) => {
    const day = new Date(Date.now() - (89 - i) * 86_400_000).toISOString().slice(0, 10);
    return { day, followers: 400 + Math.round(Math.sin(i / 8) * 15 + i * 0.4) };
  }),
  contributionsHistory: Array.from({ length: 90 }, (_, i) => ({
    date: new Date(Date.now() - (89 - i) * 86_400_000).toISOString().slice(0, 10),
    count: Math.max(0, Math.round(4 + Math.sin(i / 5) * 4 + Math.random() * 3)),
  })),
  currentFollowers: 421,
};
