<!-- The hero card below is the visit-counter pointed at the live deployment. Each
     time someone loads this README on github.com, GitHub's Camo proxy fetches the
     SVG anew (no cache) and our impression bucket updates. -->
<p align="center">
  <img src="https://ghcards.raqz.link/c/kolezka/welcome.svg?w=720&h=180" alt="kolezka-cards" width="720" />
</p>

<h1 align="center">kolezka-cards</h1>

<p align="center">
  Dynamic SVG cards for GitHub READMEs — <strong>11 card types</strong>, privacy-preserving per-card analytics, Apple liquid-glass dashboard, self-hosted in a single container.
  <br />
  <a href="https://ghcards.raqz.link"><strong>Live site →</strong></a>
  &nbsp;·&nbsp;
  <a href="https://ghcards.raqz.link/privacy">Privacy policy</a>
  &nbsp;·&nbsp;
  <a href="https://ghcards.raqz.link/methodology">Methodology</a>
</p>

<p align="center">
  <img alt="Bun" src="https://img.shields.io/badge/bun-1.x-fbf0df?logo=bun&logoColor=000" />
  <img alt="SvelteKit" src="https://img.shields.io/badge/SvelteKit-Svelte%205-ff3e00?logo=svelte&logoColor=fff" />
  <img alt="Hono" src="https://img.shields.io/badge/Hono-API-e36002?logo=hono&logoColor=fff" />
  <img alt="SQLite" src="https://img.shields.io/badge/bun:sqlite-WAL-003b57?logo=sqlite&logoColor=fff" />
  <img alt="Drizzle" src="https://img.shields.io/badge/Drizzle-ORM-c5f74f" />
  <img alt="Self-hosted" src="https://img.shields.io/badge/self--hosted-✓-7c3aed" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue" />
</p>

---

## What it is

Drop a one-liner into your README and get a server-rendered SVG that tracks impressions and unique visits without setting cookies, storing IPs, or tracking readers across days.

```markdown
![visits](https://ghcards.raqz.link/c/yourname/profile.svg)
```

Sign in with GitHub, configure size / theme / period / per-type options in the dashboard, copy the snippet, paste into your README. Everything renders server-side — your README stays plain markdown.

## Card types

| Type | What it shows | Notable config |
| --- | --- | --- |
| `visit-counter` | Total impressions + unique visits to itself | `show.total`, `show.unique` |
| `profile-views` | Compact 220×40 badge with a single view count (defaults to "Profile views") | `metric` (`total`/`unique`) |
| `profile-stats` | Followers · public repos · top languages | `show.languages` |
| `repo-stats` | Stars · forks · language breakdown | `repo: owner/name` |
| `streak` | Current + longest contribution streak (scraped from contributions graph) | — |
| `profile-summary` | Aggregated profile + contribution area chart | `period` (`1m`/`3m`/`6m`/`1y`/`2y`/`all`/`{days}`) |
| `languages` | Top-N language breakdown across repos | `limit` (3–15), `style` (`bar`/`donut`) |
| `top-repos` | Top-N repos by stars / forks / updated | `limit` (3–8), `sort` |
| `gist-counter` | Public gist count + most recent gist | `show.count`, `show.latest` |
| `wakatime` | Last 7d / 30d / 6mo / year coding time by language | `apiKey`, `range`, `limit` |
| `followers-sparkline` | Followers-over-time trend + delta | `period` (`30d`/`90d`/`365d`/`all`) |

Every card additionally accepts:

| Field | Range | Effect |
| --- | --- | --- |
| `theme` | one of 6 themes | `github_dark` (default), `github_light`, `dracula`, `nord`, `solarized_light`, `tokyo_night` |
| `title` | ≤80 chars | Override the default title |
| `overrides.{background,text,muted,accent,border}` | hex color | Per-token color overrides |
| `size.{width,height}` | 200–1200 × 80–600, integers | Per-card dimensions |

## Query overrides

Append on the SVG URL for one-off variations (handy in matrix tables or per-section embeds):

| Param | Example | Notes |
| --- | --- | --- |
| `?w=&h=` | `?w=640&h=200` | Override dimensions at render time |
| `?theme=` | `?theme=dracula` | Switch theme without saving |
| `?accent=&background=&text=&muted=&border=` | `?accent=%23ff00aa` | Hex (URL-encoded `#`) per token |
| `?title=` | `?title=My%20visits` | Override card title |
| `?hide=` | `?hide=chart,joined` | CSV of sections to hide |
| `?period=` / `?days=` | `?period=3m` or `?days=45` | Time period for `profile-summary` |

`?w=` / `?h=` and query overrides take precedence over the saved config; both fall back to per-renderer defaults.

## Privacy & analytics

The full story is at [`/privacy`](https://ghcards.raqz.link/privacy) and [`/methodology`](https://ghcards.raqz.link/methodology). Short version:

- **Per-day fingerprint**: `sha256(User-Agent | Accept-Language | Accept-Encoding | daily_salt)` where the salt rotates at 00:00 UTC. One-way; no cross-day correlation.
- **12h dedup window** per (card, fingerprint) for unique-visit counting.
- **What's stored**: country code (from `CF-IPCountry`), referrer host, UA family bucket, hourly impression aggregates.
- **What's never stored**: raw IPs, full UA strings, cookies on the SVG endpoint, cross-day identifiers, third-party trackers.
- **Self-traffic excluded**: renders whose `Referer` matches `BASE_URL` (the owner previewing in the dashboard, the demo on the landing page) bump a separate `render.self_traffic` counter and don't inflate the public metrics.
- GDPR-compliant policy with named data controller, retention details, sub-processor list, and exercise-your-rights workflow.

## Stack

| Layer | Choice |
| --- | --- |
| Runtime | **Bun** (latest stable) |
| API | **Hono** |
| Frontend | **SvelteKit** with Svelte 5 runes, `adapter-static`, Apple liquid-glass design system (`apps/web/src/lib/styles/tokens.css`) |
| Database | **SQLite** via `bun:sqlite`, WAL, `busy_timeout=5000` |
| Migrations | **Drizzle ORM** + drizzle-kit, applied inline at API startup |
| Auth | **Arctic** (GitHub OAuth) + custom session table |
| Validation | **Zod** at every boundary |
| Lint / format | **Biome** (Svelte files handled by `svelte-check`) |
| Pre-commit | **lefthook** (typecheck + biome + svelte-check + tests, ~5s) |
| Deploy | Single multi-stage `Dockerfile`, one port |
| CI | GitHub Actions: tests + typecheck + lint + Docker smoke + Drizzle schema/migration sync check |

## Quickstart

```sh
# 1. Install
bun install

# 2. Env
cp .env.example .env
# Fill APP_SECRET (`openssl rand -hex 32`), set BASE_URL=http://localhost:5173,
# DATABASE_PATH to an absolute path.

# 3. Migrate + seed sample cards
DATABASE_PATH=$PWD/data/app.db bun --filter @kc/db db:migrate
DATABASE_PATH=$PWD/data/app.db bun --filter @kc/db db:seed

# 4. Run API (:3001) + web (:5173) in parallel
bun run dev

# 5. Hit sample cards
curl -i 'http://localhost:3001/c/testuser/counter.svg'
curl -i 'http://localhost:3001/c/octocat/profile.svg'

# 6. Open the dashboard
open http://localhost:5173/
```

### Useful scripts

```sh
bun run typecheck       # tsc --noEmit across all workspaces
bun run lint            # biome check .
bun run lint:fix        # biome check --write .
bun run test            # bun:test — 220+ tests
bun run db:generate     # generate a new Drizzle migration from schema.ts
bun run db:check        # verify migration snapshots are internally consistent
bun run db:migrate      # apply migrations standalone (also runs inline at API startup)
bun run db:studio       # drizzle-kit studio
bun run db:seed         # idempotent seed
```

## Environment

See `.env.example` for the full annotated list.

| Var | Required | Notes |
| --- | --- | --- |
| `APP_SECRET` | ✓ | 32+ bytes hex. HMAC key for the daily fingerprint salt and session ids. |
| `BASE_URL` | ✓ | Public origin. Used for OAuth callback, CSRF Origin check, and self-traffic exclusion. |
| `DATABASE_PATH` | ✓ | Absolute path to the SQLite file. Coolify: `/data/app.db` on a mounted volume. |
| `NODE_ENV` | — | `development` / `test` / `production`. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | — | Both or neither. `/auth/github` returns 503 if missing. Callback URL: `$BASE_URL/auth/github/callback`. |
| `SENTRY_DSN` | — | When set, lazy-loads `@sentry/node` and forwards unhandled errors. |
| `WEB_BUILD_DIR` | — | Production-only. Path to the SvelteKit `build/` for Hono to serve as static. |
| `PORT` | — | Defaults: dev `3001`, Docker `3000`. |

## Architecture notes

### Visit deduplication through GitHub Camo

GitHub proxies every README image through `camo.githubusercontent.com`. The render route:

- Sets aggressive anti-cache headers (`Cache-Control`, `Pragma`, `Expires`, rotating `ETag`) so Camo never serves a stale SVG.
- Computes the per-day fingerprint described above.
- Marks a visit unique when no `Visit` row exists for `(card_id, fingerprint)` in the last 12 hours.
- UPSERTs the per-hour `ImpressionBucket` on every render.
- **Self-traffic** (Referer matches `BASE_URL` host) skips `trackVisit` entirely and reads totals via a read-only path so owner previews don't inflate metrics.

### Observability

- **Pino JSON logs**: one line per render with `cardId, type, wasUnique, selfTraffic, country, latencyMs, uaHash`. UAs are hashed before logging — no raw UA strings in logs anywhere.
- **`GET /metrics`** returns JSON counters: `render.total`, `render.unique`, `render.by_type{type=…}`, `render.self_traffic`, `oauth.success`, `rate_limit.rejected`, `errors.unhandled`, plus process `uptimeSec` and `rssBytes`.
- **Sentry** (optional) wires unhandled errors via lazy `@sentry/node`.

## Project layout

```
.
├── apps/
│   ├── api/         # Hono backend (Bun)
│   └── web/         # SvelteKit dashboard (Svelte 5 runes, adapter-static)
├── packages/
│   ├── db/          # Drizzle schema, migrations, client factory, seed
│   └── shared/      # Zod schemas, SVG renderers (10 cards), fingerprint + escape utilities
├── docker/
│   └── Dockerfile   # Multi-stage, single container, single port
├── scripts/
│   └── dev.ts       # Parallel dev orchestrator (api + web)
└── lefthook.yml     # Pre-commit hooks
```

## License

[MIT](./LICENSE) © 2026 [Mariusz Rakus](mailto:mariusz@raqz.pl).

Data controller for the live deployment at <https://ghcards.raqz.link>: Mariusz Rakus — see [Privacy Policy](https://ghcards.raqz.link/privacy).
