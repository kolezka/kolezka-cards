# syntax=docker/dockerfile:1.7

# -- base -----------------------------------------------------------
FROM oven/bun:1.3.10-alpine AS base
WORKDIR /app

# -- deps -----------------------------------------------------------
# Install all workspace deps from manifests only so this layer caches
# across source-only changes. Bun isolates packages in node_modules/.bun
# and symlinks them into each workspace's node_modules/ — both halves
# need to land in the runtime image.
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

# -- runtime --------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/app.db
ENV WEB_BUILD_DIR=/app/apps/web/build

# Bring the full deps-stage tree (manifests + node_modules + workspace
# symlinks under apps/*/node_modules and packages/*/node_modules). Then
# overlay the real source files on top — Docker's COPY merges into
# existing directories, so the workspace node_modules survive.
COPY --from=deps /app /app
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api
COPY --from=web-build /app/apps/web/build ./apps/web/build

VOLUME ["/data"]
EXPOSE 3000

CMD ["sh", "-c", "cd /app && bun packages/db/src/migrate.ts && bun apps/api/src/index.ts"]
