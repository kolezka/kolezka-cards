import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import type { MiddlewareHandler } from 'hono';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

export interface StaticServeOptions {
  root: string;
  reservedPrefixes: string[];
  fallback?: string;
}

export function staticServe(opts: StaticServeOptions): MiddlewareHandler {
  const root = resolve(opts.root);
  const fallback = opts.fallback ? join(root, opts.fallback) : null;
  const reserved = opts.reservedPrefixes;

  return async (c, next) => {
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') return next();
    const path = c.req.path;
    for (const prefix of reserved) {
      if (path === prefix || path.startsWith(`${prefix}/`)) return next();
    }

    const rel = path === '/' ? '/index.html' : path;
    const candidate = normalize(join(root, rel));
    if (!candidate.startsWith(root + sep) && candidate !== root) {
      return c.text('Forbidden', 403);
    }

    let target = candidate;
    if (!existsSync(target) && fallback) target = fallback;
    if (!existsSync(target)) return next();

    const file = Bun.file(target);
    const mime = MIME[extname(target)] ?? 'application/octet-stream';
    c.header('Content-Type', mime);
    if (target === fallback || target.endsWith('.html')) {
      c.header('Cache-Control', 'no-cache');
    } else {
      c.header('Cache-Control', 'public, max-age=31536000, immutable');
    }
    return c.body(await file.arrayBuffer());
  };
}
