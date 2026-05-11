import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { csrfGuard } from './csrf';

function build(baseUrl: string) {
  const app = new Hono();
  app.use('/api/*', csrfGuard({ BASE_URL: baseUrl }));
  app.get('/api/me', (c) => c.json({ ok: true }));
  app.post('/api/cards', (c) => c.json({ ok: true }));
  return app;
}

const BASE = 'http://localhost:3001';

describe('csrfGuard', () => {
  it('lets safe methods through without headers', async () => {
    const app = build(BASE);
    const res = await app.request('http://localhost:3001/api/me');
    expect(res.status).toBe(200);
  });

  it('rejects POST without X-Requested-By header', async () => {
    const app = build(BASE);
    const res = await app.request('http://localhost:3001/api/cards', {
      method: 'POST',
      headers: { Origin: BASE, 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(403);
  });

  it('rejects POST with mismatched Origin', async () => {
    const app = build(BASE);
    const res = await app.request('http://localhost:3001/api/cards', {
      method: 'POST',
      headers: {
        Origin: 'https://evil.example',
        'X-Requested-By': 'web',
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    expect(res.status).toBe(403);
  });

  it('accepts POST with matching Origin + X-Requested-By', async () => {
    const app = build(BASE);
    const res = await app.request('http://localhost:3001/api/cards', {
      method: 'POST',
      headers: { Origin: BASE, 'X-Requested-By': 'web', 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(200);
  });

  it('accepts POST when Origin missing if X-Requested-By is present (same-origin browser quirk)', async () => {
    const app = build(BASE);
    const res = await app.request('http://localhost:3001/api/cards', {
      method: 'POST',
      headers: { 'X-Requested-By': 'web', 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(200);
  });
});
