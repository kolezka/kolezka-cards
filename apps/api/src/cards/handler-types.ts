import type { DB } from '@kc/db';
import type { CardConfig } from '@kc/shared/zod/card-config';
import type { parseQueryOverrides } from '@kc/shared/zod/query-overrides';
import type { GitHubClient } from '../services/github-client';

/**
 * Thrown by a handler to short-circuit the response with a specific status
 * code (e.g. 404 "GitHub user not found", 400 "Invalid repo"). The route
 * catches it and emits a c.text reply.
 */
export class HandlerError extends Error {
  public readonly status: 400 | 404 | 502;
  constructor(status: 400 | 404 | 502, message: string) {
    super(message);
    this.status = status;
  }
}

export type CardRow = {
  id: string;
  userId: string;
  slug: string;
  type: string;
  configJson: unknown;
  theme: string;
  createdAt: Date;
  updatedAt: Date;
};

export type VisitData = {
  totalImpressions: number;
  uniqueVisits: number;
  wasUnique: boolean;
};

export type HandlerCtx = {
  config: CardConfig;
  query: ReturnType<typeof parseQueryOverrides>;
  card: CardRow;
  ownerLogin: string;
  db: DB;
  github: GitHubClient;
  visit: VisitData;
};

export type CardHandler = (ctx: HandlerCtx) => Promise<string>;
