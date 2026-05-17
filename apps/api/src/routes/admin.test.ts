import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import * as schema from '@kc/db/schema';
import { type TestDB, createTestDb } from '@kc/db/testing';
import type { Env } from '@kc/shared/env';
import { nanoid } from 'nanoid';
import { SESSION_COOKIE } from '../auth/cookies';
import { createSession } from '../services/sessions';
import { createAdminRoute } from './admin';

let db: TestDB;
let close: () => Promise<void>;

const env: Env = {
  APP_SECRET: 'x'.repeat(32),
  BASE_URL: 'https://example.com',
  NODE_ENV: 'test',
  ADMIN_LOGINS: 'admin-user',
};

let adminUserId: string;
let regularUserId: string;
let regularCardId: string;
let adminSessionId: string;
let regularSessionId: string;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});

afterAll(async () => {
  await close();
});

beforeEach(async () => {
  await db.delete(schema.sessions);
  await db.delete(schema.cards);
  await db.delete(schema.users);

  adminUserId = nanoid(16);
  regularUserId = nanoid(16);
  await db.insert(schema.users).values({ id: adminUserId, githubId: 1, login: 'admin-user' });
  await db.insert(schema.users).values({ id: regularUserId, githubId: 2, login: 'regular-user' });

  regularCardId = nanoid(12);
  await db.insert(schema.cards).values({
    id: regularCardId,
    userId: regularUserId,
    slug: 'demo',
    type: 'visit-counter',
    configJson: { type: 'visit-counter' },
  });

  adminSessionId = (await createSession(db, { userId: adminUserId, userAgent: 'admin-ua' })).id;
  regularSessionId = (await createSession(db, { userId: regularUserId, userAgent: 'user-ua' })).id;
});

function authHeader(sid: string | null): HeadersInit {
  return sid ? { cookie: `${SESSION_COOKIE}=${sid}` } : {};
}

async function call(
  path: string,
  init: RequestInit & { sid?: string | null } = {},
): Promise<Response> {
  const { sid = null, headers, ...rest } = init;
  const app = createAdminRoute(db, env);
  return await app.request(`http://test${path}`, {
    ...rest,
    headers: { ...authHeader(sid), ...(headers ?? {}) },
  });
}

describe('admin routes — auth gates', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await call('/api/admin/users');
    expect(res.status).toBe(401);
  });

  it('rejects non-admin signed-in users with 403', async () => {
    const res = await call('/api/admin/users', { sid: regularSessionId });
    expect(res.status).toBe(403);
  });

  it('lets admin users through', async () => {
    const res = await call('/api/admin/users', { sid: adminSessionId });
    expect(res.status).toBe(200);
  });
});

describe('GET /api/admin/users', () => {
  it('returns all users with their card counts', async () => {
    const res = await call('/api/admin/users', { sid: adminSessionId });
    const body = (await res.json()) as Array<{ login: string; cardCount: number }>;
    const byLogin = Object.fromEntries(body.map((u) => [u.login, u]));
    expect(byLogin['admin-user']?.cardCount).toBe(0);
    expect(byLogin['regular-user']?.cardCount).toBe(1);
  });
});

describe('GET /api/admin/users/:userId/cards', () => {
  it('returns cards belonging to the user with impression totals', async () => {
    await db.insert(schema.impressionBuckets).values({
      cardId: regularCardId,
      hourBucket: 999_999,
      totalImpressions: 7,
      uniqueVisits: 3,
      directImpressions: 5,
      camoImpressions: 2,
    });

    const res = await call(`/api/admin/users/${regularUserId}/cards`, { sid: adminSessionId });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      user: { login: string };
      cards: Array<{ slug: string; totalImpressions: number; uniqueVisits: number }>;
    };
    expect(body.user.login).toBe('regular-user');
    expect(body.cards).toHaveLength(1);
    expect(body.cards[0]?.slug).toBe('demo');
    expect(body.cards[0]?.totalImpressions).toBe(7);
    expect(body.cards[0]?.uniqueVisits).toBe(3);
  });

  it('returns 404 for an unknown user id', async () => {
    const res = await call('/api/admin/users/does-not-exist/cards', { sid: adminSessionId });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/admin/cards/:cardId', () => {
  it('deletes a card', async () => {
    const res = await call(`/api/admin/cards/${regularCardId}`, {
      sid: adminSessionId,
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
    const remaining = await db.select().from(schema.cards);
    expect(remaining).toHaveLength(0);
  });

  it('returns 404 for an unknown card', async () => {
    const res = await call('/api/admin/cards/missing', {
      sid: adminSessionId,
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/admin/users/:userId', () => {
  it('deletes a user and cascades their cards', async () => {
    const res = await call(`/api/admin/users/${regularUserId}`, {
      sid: adminSessionId,
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
    expect(await db.select().from(schema.users)).toHaveLength(1);
    expect(await db.select().from(schema.cards)).toHaveLength(0);
  });

  it('refuses to let an admin delete themselves', async () => {
    const res = await call(`/api/admin/users/${adminUserId}`, {
      sid: adminSessionId,
      method: 'DELETE',
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('cannot_delete_self');
    expect(await db.select().from(schema.users)).toHaveLength(2);
  });

  it('returns 404 for an unknown user id', async () => {
    const res = await call('/api/admin/users/nope', {
      sid: adminSessionId,
      method: 'DELETE',
    });
    expect(res.status).toBe(404);
  });
});
