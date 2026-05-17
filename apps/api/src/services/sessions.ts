import { createHash, randomBytes } from 'node:crypto';
import { type DB, schema } from '@kc/db';
import { eq, lt } from 'drizzle-orm';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export interface CreateSessionInput {
  userId: string;
  userAgent?: string | null;
  now?: Date;
}

export interface CreateSessionResult {
  id: string;
  expiresAt: Date;
}

function hashUa(ua: string | null | undefined): string | null {
  if (!ua) return null;
  return createHash('sha256').update(ua).digest('hex');
}

function newSessionId(): string {
  return randomBytes(24).toString('base64url');
}

export async function createSession(
  db: DB,
  input: CreateSessionInput,
): Promise<CreateSessionResult> {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const id = newSessionId();
  await db.insert(schema.sessions).values({
    id,
    userId: input.userId,
    userAgentHash: hashUa(input.userAgent),
    expiresAt,
    createdAt: now,
  });
  return { id, expiresAt };
}

export interface LoadedSession {
  session: schema.Session;
  user: schema.User;
}

export async function loadSession(
  db: DB,
  sessionId: string,
  now: Date = new Date(),
): Promise<LoadedSession | null> {
  const rows = await db
    .select()
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(eq(schema.sessions.id, sessionId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.sessions.expiresAt.getTime() <= now.getTime()) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
    return null;
  }
  return { session: row.sessions, user: row.users };
}

export async function refreshSessionIfStale(
  db: DB,
  sessionId: string,
  now: Date = new Date(),
): Promise<{ expiresAt: Date } | null> {
  const rows = await db
    .select({ expiresAt: schema.sessions.expiresAt })
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const remaining = row.expiresAt.getTime() - now.getTime();
  if (remaining > SESSION_REFRESH_THRESHOLD_MS) return null;
  const newExpiry = new Date(now.getTime() + SESSION_TTL_MS);
  await db
    .update(schema.sessions)
    .set({ expiresAt: newExpiry })
    .where(eq(schema.sessions.id, sessionId));
  return { expiresAt: newExpiry };
}

export async function deleteSession(db: DB, sessionId: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}

export async function sweepExpiredSessions(db: DB, now: Date = new Date()): Promise<void> {
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, now));
}

export async function deleteUserSessions(db: DB, userId: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}
