---
name: e2e-qa
status: approved
date: 2026-05-25
---

# End-to-end QA design

Purpose: bring the kolezka-cards repo to a known, verified state across local dev and the production docker-compose stack, without touching the live Coolify deployment. The first pass is diagnostic, not corrective: surface exactly where the repo is healthy and where it is not, then decide separately what to fix.

Last updated: 2026-05-25

## Scope

In scope:
- Local development loop (Bun install, dev mode, Postgres in docker).
- Static guarantees: typecheck, biome lint, drizzle snapshot consistency.
- Automated test suite (the README claims 286 tests in 30 files).
- Production docker-compose stack on the local host (`docker-compose.yml`, app + postgres image with baked credentials).
- Smoke verification of the surfaces the README advertises: card render endpoints, `/healthz`, `/metrics`, dashboard pages, OAuth gate (without real GitHub credentials).

Out of scope:
- Coolify redeploy of `ghcards.raqz.link`.
- Performance / load tests.
- Cross-browser matrix beyond a single Playwright snapshot.
- Dependency vulnerability scan.

## Fix strategy (stop-at-first-blocker)

- **Hard stop on blockers.** Anything that prevents subsequent phases from running halts the QA pass. Examples: TypeScript compile error, `bun install` failure, broken migration, dev server crash on boot, docker build failure, prod stack failing healthcheck. No silent workarounds, no `--force`, no test-skipping.
- **Non-blocking failures are recorded, not fixed.** A flaky test that does not block other tests, a lint warning, a missing optional env var (e.g. `SENTRY_DSN`, `WAKATIME` keys) — these go on the report. The QA pass continues but the repo is not edited.
- **No inline cosmetic fixes.** Even an obvious typo in `.env.example` is reported, not silently patched. The user decides what to change after the pass completes.

This means the QA pass may terminate before phase 9. A truncated report is the correct output in that case.

## Phases

Each phase has an entry condition, an exit condition, and a recorded outcome (pass / fail / skipped-with-reason).

### Phase 0 — Preflight

**Goal:** confirm host environment can run the rest of the pass.

Checks:
- `bun --version` present and recent enough for the project's `package.json` engines (if pinned).
- `docker --version` and `docker compose version` available.
- Ports 3001 (api), 5173 (web), 5432 (postgres) are free.
- `.env` exists (or `.env.example` can be copied) with at minimum `APP_SECRET`, `BASE_URL`, `POSTGRES_PASSWORD`.

Exit: environment OK or hard stop with a clear list of missing prerequisites.

### Phase 1 — Install

`bun install` from repo root. Expect a clean lockfile resolution. Record warnings about peer deps but only block on hard errors.

### Phase 2 — Static analysis

Two commands in sequence:
- `bun run typecheck` — must be zero TS errors across all workspaces.
- `bun run lint` — biome must exit zero. Warnings recorded but not blocking.

If typecheck fails, stop — every later phase loses meaning.

### Phase 3 — Unit and integration tests

`bun run test`. README claims 286 tests across 30 files. Record:
- Total / passed / failed / skipped.
- Per-file failure list with first failing assertion.
- Wall-clock time.

A single test failure does not necessarily block phase 4, but more than ~5% red is treated as a blocker because it implies systemic drift since the last green main.

### Phase 4 — DB pipeline

Sequence:
1. `docker compose -f docker-compose.dev.yml up -d` — bring up the dev Postgres.
2. Wait for `pg_isready` (timeout 30s).
3. `bun run db:migrate` against the dev database.
4. `bun run db:seed` — must be idempotent (run twice, second run is a no-op or refresh).
5. `bun --filter @kc/db drizzle-kit check` (or equivalent) — schema snapshot internally consistent.

Hard stop if migrations fail or snapshot is dirty.

### Phase 5 — Dev mode smoke

`bun run dev` in the background. Wait for api and web ports to listen.

Curl the following surfaces, record status + first 200 bytes of body:
- `GET /healthz` — expect 200.
- `GET /metrics` — expect 200 JSON with the documented counters.
- `GET /c/octocat/profile.svg` — expect 200 `image/svg+xml`, valid XML, dimensions match defaults.
- `GET /c/testuser/counter.svg?w=320&h=120` — expect 200 SVG at 320×120.
- `GET /api/me/github-stats` without session — expect 401.
- `GET /auth/github` without `GITHUB_CLIENT_ID` set — expect 503 (documented behaviour).
- `GET /` (web on :5173) — expect 200 HTML.

Hard stop if either process fails to start or `/healthz` is not green.

### Phase 6 — Web dashboard smoke

Using Playwright (already in the stack), navigate and snapshot:
- Landing `/`.
- `/privacy`.
- `/methodology`.
- `/login` (or whatever the GitHub OAuth entry page is).

Record console errors per page. Any uncaught client exception is blocking.

### Phase 7 — Production build

- `bun run --filter @kc/web build` — SvelteKit static build succeeds.
- `docker build -f docker/Dockerfile -t kolezka-cards:qa .` — image builds cleanly.
- `docker build -f docker/postgres.Dockerfile -t kolezka-postgres:qa .` — custom postgres image builds.

Block on any build failure.

### Phase 8 — docker-compose.yml (prod stack)

After teardown of phase 4's dev postgres:
1. `docker compose up -d` with the prod compose file.
2. Wait up to 90s for both services to report healthy.
3. Inside the running app container, verify migrations were applied on boot (log line check).
4. From the host: curl the same six smoke endpoints as phase 5, against the published port.
5. Inspect `docker compose logs app` for unhandled errors during boot.

Block on stack failing healthcheck or any 5xx on smoke endpoints.

### Phase 9 — Teardown and final report

- `docker compose down -v` for the prod stack.
- `docker compose -f docker-compose.dev.yml down -v` if still running.
- Remove the temporary `kolezka-cards:qa` and `kolezka-postgres:qa` images (`docker image rm`).
- Write the consolidated report to `docs/qa/2026-05-25-e2e-report.md`.

## Report format

The QA report has one section per phase. Each section records:
- Outcome: `pass` / `fail` / `skipped` / `not-reached`.
- Commands executed (verbatim).
- Output excerpts (first failing assertion, error message, smoke response).
- Recommendation (one of: `no-action`, `fix-suggested`, `decision-needed`).

A summary table at the top maps phase → outcome → recommendation. The closing section is a triaged list of every recorded issue with severity (`blocker` / `regression` / `warning` / `cosmetic`), so the user can decide what to address in a follow-up pass.

## Deliverables

1. This design at `docs/superpowers/specs/2026-05-25-e2e-qa-design.md` (committed before the QA pass starts).
2. Implementation plan at `docs/superpowers/plans/2026-05-25-e2e-qa-plan.md` (produced by the writing-plans skill).
3. Final QA report at `docs/qa/2026-05-25-e2e-report.md` after the pass.

## Non-goals (explicit)

- This pass does not modify production. The live `ghcards.raqz.link` deployment is untouched.
- This pass does not introduce new features, refactors, or dependency upgrades.
- This pass does not chase warnings into clean state; warnings are diagnostic signal, not work items.
