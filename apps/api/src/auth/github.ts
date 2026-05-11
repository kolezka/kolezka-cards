import { type Env, oauthConfigured } from '@kc/shared/env';
import { GitHub } from 'arctic';

export function githubProvider(env: Env): GitHub | null {
  if (!oauthConfigured(env)) return null;
  return new GitHub(
    env.GITHUB_CLIENT_ID!,
    env.GITHUB_CLIENT_SECRET!,
    new URL('/auth/github/callback', env.BASE_URL).toString(),
  );
}

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string | null;
}

export async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'kolezka-cards',
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) {
    throw new Error(`github /user failed: ${res.status}`);
  }
  const data = (await res.json()) as GitHubUser;
  if (typeof data.id !== 'number' || typeof data.login !== 'string') {
    throw new Error('github /user response missing id/login');
  }
  return data;
}
