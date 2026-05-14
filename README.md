# kolezka-cards

Public SaaS that generates dynamic SVG cards for GitHub READMEs, with per-card analytics and visit deduplication through GitHub's Camo image proxy.

Self-hosted on Coolify (Bun + Hono + SvelteKit + bun:sqlite, single Docker image).

## Card types

- `visit-counter` — meta card showing total + unique visits to itself
- `profile-stats` — followers, public repos, top languages
- `repo-stats` — stars, forks, language breakdown
- `streak` — contribution streak (current + longest) scraped from the public contribution graph

Every card supports per-render query overrides: `?theme=`, `?title=`, `?accent=`, `?background=`, `?text=`, `?muted=`, `?border=`, `?hide=section1,section2`.

## Stack

| Layer | Choice |
| --- | --- |
| Runtime | Bun (latest stable) |
| API | Hono |
| Frontend | SvelteKit (Svelte 5 runes, `adapter-static`) |
| Database | SQLite via `bun:sqlite` with WAL + busy_timeout=5000 |
| Migrations | Drizzle ORM + drizzle-kit |
| Auth | Arctic (GitHub OAuth) + custom session table |
| Validation | Zod everywhere |
| Lint/format | Biome (Svelte files handled by svelte-check) |
| Pre-commit | lefthook |
| Deploy | Single multi-stage Dockerfile, one port |

## Quickstart (local development)

```sh
# 1. Install
bun install

# 2. Seed env
cp .env.example .env
# Fill APP_SECRET (`openssl rand -hex 32`) and set DATABASE_PATH to an absolute path.

# 3. Apply migrations + seed sample cards
DATABASE_PATH=$PWD/data/app.db bun --filter @kc/db db:migrate
DATABASE_PATH=$PWD/data/app.db bun --filter @kc/db db:seed

# 4. Run api (:3001) + web (:5173)
bun run dev

# 5. Hit the seeded cards
curl -i 'http://localhost:3001/c/testuser/counter.svg'
curl -i 'http://localhost:3001/c/octocat/profile.svg'
curl -i 'http://localhost:3001/c/octocat/hello.svg'
curl -i 'http://localhost:3001/c/octocat/streak.svg'

# 6. Open the dashboard
open http://localhost:5173/
```

### Useful scripts

```sh
bun run typecheck    # tsc --noEmit across all workspaces
bun run lint         # biome check .
bun run lint:fix     # biome check --write .
bun run test         # bun:test runner — 90+ tests
bun run db:generate  # generate a new Drizzle migration after editing schema.ts
bun run db:check     # verify migration snapshots are internally consistent
bun run db:migrate   # apply migrations standalone (also runs inline at API startup)
bun run db:studio    # drizzle-kit studio
bun run db:seed      # idempotent seed
```

lefthook runs typecheck + biome + svelte-check + tests on `git commit`.

## Environment

See `.env.example` for the canonical list. Summary:

| Var | Required | Notes |
| --- | --- | --- |
| `APP_SECRET` | yes | 32+ bytes hex. HMAC key for the daily-rotating fingerprint salt and session ids. |
| `BASE_URL` | yes | Public URL of the deployed app. OAuth callback origin + CSRF Origin check derive from it. |
| `DATABASE_PATH` | yes | Absolute path. Coolify: `/data/app.db` on a mounted volume. |
| `NODE_ENV` | no | `development` (default) / `test` / `production`. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | no | Both or neither. `/auth/github` returns 503 if missing. Callback URL: `$BASE_URL/auth/github/callback`. |
| `SENTRY_DSN` | no | When set, lazy-loads `@sentry/node` and forwards unhandled errors. |
| `WEB_BUILD_DIR` | no | Set in the Docker runtime. Path to the SvelteKit `build/` for Hono to serve as static. |
| `PORT` | no | Bind port. Dev defaults 3001; Dockerfile sets 3000. |

## Architecture notes

### Visit deduplication through GitHub Camo

GitHub proxies every README image through `camo.githubusercontent.com`. We never see the end user's IP, and Camo caches aggressively. The render route therefore:

- Sets `Cache-Control: no-cache, no-store, must-revalidate, max-age=0, s-maxage=0` + `Pragma: no-cache` + `Expires: 0` + a rotating per-request `ETag`.
- Computes a per-day fingerprint:
  ```
  fingerprint = sha256(User-Agent | Accept-Language | Accept-Encoding | daily_salt)
  daily_salt = HMAC(APP_SECRET, "salt:" + UTC-date)
  ```
- Marks a visit "unique" when no `Visit` row exists for `(card_id, fingerprint)` in the last 12 hours.
- UPSERTs the per-hour `ImpressionBucket` on every render (total + unique deltas).
- The midnight-UTC salt rotation means a returning visitor next day cannot be linked back; minor over-count on the boundary is documented at `/methodology`.

### Rate limiting

A single in-memory token bucket per `CF-Connecting-IP` (falls back to `X-Forwarded-For`, then `unknown`). 600 requests/min hard cap on `/c/*`. 429 + `Retry-After` on exhaustion. WARN log on every rejection. Idle buckets are swept every 5 minutes.

### CSRF

Custom CSRF guard on `/api/*` mutations: `Origin` must match `BASE_URL` (when present) AND `X-Requested-By: web` is required. Cookies are `httpOnly`, `secure` in prod, `sameSite=lax`.

### Observability

- Pino JSON logs. One line per render with `cardId, type, wasUnique, country, latencyMs, uaHash`. UAs are hashed before logging — no raw UA strings in logs.
- `GET /metrics` returns JSON counters: `render.total`, `render.unique`, `render.by_type{type=...}`, `oauth.success`, `rate_limit.rejected`, `errors.unhandled`, plus process `uptimeSec` and `rssBytes`.
- `SENTRY_DSN` (optional) wires unhandled errors into Sentry via lazy `@sentry/node`.

### What we do not store

- No raw IPs, ever. Only country codes from `CF-IPCountry`.
- No User-Agent strings in logs (hashed).
- No cross-day identifiers — daily salt rotation breaks the link.
- No cookies or persistent identifiers on the embedded SVG endpoint.

## Local Docker (prod-parity smoke test)

Build the production image and run it on `:3000` with a SQLite volume — same shape Coolify deploys:

```sh
cp .env.example .env
# Fill APP_SECRET (`openssl rand -hex 32`), set BASE_URL=http://localhost:3000.

docker compose up -d --build
curl -i http://localhost:3000/healthz
docker compose logs -f app
docker compose down -v   # tears down + drops the data volume
```

The container runs `bun apps/api/src/index.ts` on boot. The API calls `runStartupMigrations` as the very first step before opening any request-serving connection, so each container start brings the schema up to date in a single process. A `db.migrate` event in the logs reports `applied`, `total`, and `latestHash`; on failure the API logs `db.migrate.failed` at fatal and exits non-zero so Docker restarts the container instead of serving against a stale schema.

### Containerized dev (optional)

If you want every dev dependency inside a container, use the dev compose. Bind-mounts the source for hot reload, isolates `node_modules` in a named volume so Alpine installs don't clobber host installs, and seeds sample data on first boot. Schema migrations are applied inline by the API at startup (and by `seed.ts` before insert), so the compose command no longer chains a separate migrate step.

```sh
docker compose -f docker-compose.dev.yml up
open http://localhost:5173
```

This is the slower path. Spec-preferred dev is `bun run dev` on the host.

## Coolify deploy

1. Push to `kolezka/kolezka-cards`.
2. In Coolify, point a new "Dockerfile" application at the repo. Build context: repo root. Dockerfile path: `docker/Dockerfile`.
3. Mount a persistent volume at `/data` for the SQLite database.
4. Configure environment variables (see table above). At minimum: `APP_SECRET`, `BASE_URL`, `DATABASE_PATH=/data/app.db`, `NODE_ENV=production`. Add GitHub OAuth creds when the OAuth app is registered.
5. Coolify exposes port 3000 behind its Cloudflare-Tunnel reverse proxy.
6. The entrypoint runs `bun apps/api/src/index.ts` directly. The API applies Drizzle migrations inline before serving requests (event `db.migrate` in pino logs); a failure logs `db.migrate.failed` at fatal and aborts the process, so Coolify restarts the container instead of running against a stale schema.
7. CI (`.github/workflows/ci.yml`) runs `drizzle-kit check` plus a re-run of `drizzle-kit generate` with `git diff --exit-code` to fail any PR that changes `schema.ts` without committing the matching migration file — the most common reason a deploy ships with "migrations not applied".

## Project layout

```
.
├── apps/
│   ├── api/       # Hono backend (Bun)
│   └── web/       # SvelteKit dashboard (Svelte 5 runes, adapter-static)
├── packages/
│   ├── db/        # Drizzle schema, migrations, client factory, seed
│   └── shared/    # Zod schemas, SVG templates, fingerprint + escape utilities
├── docker/
│   └── Dockerfile # Multi-stage build, single container
├── scripts/
│   └── dev.ts     # Parallel dev orchestrator
└── lefthook.yml   # Pre-commit hooks
```

## Methodology + Privacy pages

Live in the dashboard:

- `/methodology` — technical explanation of the fingerprint, the 12-hour dedup window, and the midnight-UTC salt rotation.
- `/privacy` — explicit disclosure of every field collected and every field deliberately not collected.

## License

Private. Self-hosted by [@kolezka](https://github.com/kolezka).
