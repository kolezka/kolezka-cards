import type { MiddlewareHandler } from 'hono';

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  await next();
  const isHtml = (c.res.headers.get('content-type') ?? '').includes('text/html');
  if (isHtml) {
    // CSP for prerendered SvelteKit pages is emitted as a <meta http-equiv>
    // tag with build-time hashes (apps/web/svelte.config.js → kit.csp).
    // A header CSP here would intersect and block SvelteKit's inline boot
    // script unless we replicated the same hashes — the meta tag owns it.
    c.header('X-Frame-Options', 'DENY');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
};
