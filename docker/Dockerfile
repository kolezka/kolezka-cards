# syntax=docker/dockerfile:1.7

# -- base -----------------------------------------------------------
FROM oven/bun:1.3.10-alpine AS base
WORKDIR /app

# -- deps -----------------------------------------------------------
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN bun install --frozen-lockfile

# -- web build ------------------------------------------------------
FROM deps AS web-build
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/web apps/web
RUN cd apps/web && bun x svelte-kit sync && bun run build

# -- runtime image --------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/app.db

# copy production node_modules from deps (Bun workspaces hoist into root)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/bun.lock ./bun.lock

# copy source needed at runtime (Bun runs TS directly)
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api
COPY --from=web-build /app/apps/web/build ./apps/web/build

# DB volume is mounted by the platform (Coolify). Schema bootstrap runs
# on first boot via the migrate script.
VOLUME ["/data"]

ENV WEB_BUILD_DIR=/app/apps/web/build
EXPOSE 3000

CMD ["sh", "-c", "cd /app && bun packages/db/src/migrate.ts && bun apps/api/src/index.ts"]
