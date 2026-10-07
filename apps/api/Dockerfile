# syntax=docker/dockerfile:1
#
# Build from the repository root, because the workspace lockfile lives there:
#   docker build -f apps/api/Dockerfile -t pethouse-api .

ARG NODE_IMAGE=node:22-alpine

# --- 1. Dependencies, with the dev tooling needed to compile ------------------------------------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
# Every workspace manifest is required for `npm ci` to accept the lockfile; only the API's
# dependencies get installed.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
COPY packages/api-client/package.json packages/api-client/
RUN npm ci --workspace @pethouse/api

# --- 2. Compile -------------------------------------------------------------------------------------
FROM deps AS build
COPY apps/api apps/api
RUN npm run build --workspace @pethouse/api

# --- 3. Runtime: production dependencies and the compiled output only, as a non-root user ------------
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
COPY packages/api-client/package.json packages/api-client/
RUN npm ci --workspace @pethouse/api --omit=dev && npm cache clean --force
COPY --from=build /app/apps/api/dist apps/api/dist

USER node
WORKDIR /app/apps/api
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "dist/main"]
