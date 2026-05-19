import type { DB } from '@kc/db';
import { type Env, isAdminLogin } from '@kc/shared/env';
import { Hono } from 'hono';
import { type SessionContext, requireSession } from '../middleware/session';
import { type GitHubClient, createGitHubClient } from '../services/github-client';

export function createMeRoute(
  db: DB,
  env: Env,
  github: GitHubClient = createGitHubClient(),
): Hono<SessionContext> {
  const app = new Hono<SessionContext>();
  app.use('/api/me', requireSession(db, env));
  app.use('/api/me/*', requireSession(db, env));
  app.get('/api/me', (c) => {
    const u = c.get('user');
    return c.json({
      id: u.id,
      githubId: u.githubId,
      login: u.login,
      avatarUrl: u.avatarUrl,
      isAdmin: isAdminLogin(env, u.login),
    });
  });
  // Headline GitHub profile numbers for the in-edit live preview, so the
  // mock data shows the user's real repo / follower / gist counts instead
  // of octocat's placeholders. The GitHubClient caches results (6h TTL by
  // default) so repeated edits don't hammer the GitHub API.
  app.get('/api/me/github-stats', async (c) => {
    const u = c.get('user');
    try {
      const gh = await github.getUser(u.login);
      if (!gh) return c.json({ error: 'github_user_not_found' }, 404);
      return c.json({
        login: gh.login,
        publicRepos: gh.public_repos,
        publicGists: gh.public_gists,
        followers: gh.followers,
        following: gh.following,
        joinedAt: gh.created_at,
      });
    } catch {
      // Transient upstream failure (rate limit, 5xx) — let the client fall
      // back to mock data rather than blocking the preview.
      return c.json({ error: 'github_unavailable' }, 502);
    }
  });
  return app;
}
