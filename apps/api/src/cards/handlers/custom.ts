import { type CustomData, neededSources, renderCustom } from '@kc/shared/svg/custom';
import { CustomConfig } from '@kc/shared/zod/card-config';
import { getFollowersHistory, snapshotFollowers } from '../../services/followers-history';
import { computeStreakStats, fetchContributions } from '../../services/github-contributions';
import type { CardHandler } from '../handler-types';
import { applyQueryOverrides, fetchUserRepos, pickDims } from '../utils';

export const renderCustomHandler: CardHandler = async ({
  config,
  query,
  card,
  ownerLogin,
  db,
  github,
  visit,
}) => {
  const merged = applyQueryOverrides(config, query);
  const parsed = CustomConfig.parse(merged);
  const need = neededSources(parsed);
  const data: CustomData = {
    visits: { total: visit.totalImpressions, unique: visit.uniqueVisits },
  };

  // Load GitHub user only if any block references github.*.
  if (need.needsGithubUser) {
    const user = await github.getUser(ownerLogin);
    if (user) {
      data.github = {
        followers: user.followers,
        repos: user.public_repos,
        gists: user.public_gists ?? 0,
      };
      data.currentFollowers = user.followers;
    }
  }

  // Aggregate stars across repos + derive top language.
  if (need.needsGithubRepos) {
    const repos = await fetchUserRepos(ownerLogin);
    if (repos) {
      const langAgg: Record<string, number> = {};
      let starsTotal = 0;
      for (const r of repos) {
        starsTotal += r.stargazers_count ?? 0;
        if (r.language) langAgg[r.language] = (langAgg[r.language] ?? 0) + (r.size || 1);
      }
      data.github = { ...(data.github ?? {}), stars: starsTotal };
      const topLang = Object.entries(langAgg).sort((a, b) => b[1] - a[1])[0]?.[0];
      if (topLang && data.github) data.github.topLanguage = topLang;
    }
  }

  // Contributions feed: powers both a stat (year total) and the sparkline
  // (daily counts). Fetched once and reused.
  if (need.needsContributions) {
    const days = await fetchContributions(ownerLogin);
    if (days) {
      const stats = computeStreakStats(days);
      data.github = { ...(data.github ?? {}), contributionsYear: stats.totalThisYear };
      data.contributionsHistory = days.map((d) => ({ date: d.date, count: d.count }));
    }
  }

  // Followers sparkline: snapshot today's count and read history.
  if (need.needsFollowersHistory) {
    if (data.currentFollowers === undefined) {
      const user = await github.getUser(ownerLogin);
      if (user) data.currentFollowers = user.followers;
    }
    if (data.currentFollowers !== undefined) {
      await snapshotFollowers(db, card.userId, data.currentFollowers);
    }
    data.followersHistory = await getFollowersHistory(db, card.userId);
  }

  return renderCustom(parsed, data, pickDims(parsed, query));
};
