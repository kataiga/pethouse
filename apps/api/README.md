# @pethouse/api

NestJS 11 + MikroORM 6 + MySQL backend of Pethouse. Read `CLAUDE.md` in this directory and at the
repository root before changing anything; `/docs/architecture.md` holds the domain model.

## Run it locally

From this directory:

```bash
cp .env.exemple .env          # dev values matching docker-compose.yml
docker compose up -d          # MySQL 8.4, Redis 7.4, MinIO
npm run mikro:up              # migrations
npm run start:dev             # http://localhost:3000/api, docs on http://localhost:3000/docs
```

MinIO's console is on http://localhost:9001 (`pethouse` / `pethouse-dev-secret`).

Every environment variable is listed and documented in `.env.exemple` and validated at boot by
`src/config/environment.ts`: a missing or malformed variable stops the API with the full list of
problems.

## Scripts

| Script | What it does |
|---|---|
| `npm run lint` / `lint:fix` | ESLint over `src/` and `test/` |
| `npm run typecheck` | `tsc --noEmit` under strict settings |
| `npm run build` | Compiles to `dist/` |
| `npm test` | Unit suite (`src/**/*.spec.ts`) |
| `npm run test:integration` | Integration suite (`src/**/*.int-spec.ts`, real database, no HTTP) |
| `npm run test:e2e` | E2E suite (`test/**/*.e2e-spec.ts`), needs MySQL from `docker compose` |
| `npm run test:all` | The three suites |
| `npm run openapi:dump` | Writes `openapi.json` from the decorators, no database needed |
| `npm run generate:module <kebab-name>` | Scaffolds a feature module following the conventions |
| `npm run mikro:generate` / `mikro:up` / `mikro:down` | MikroORM migrations |

Tests run under `NODE_ENV=test` (Jest sets it) and read the committed `.env.test`; variables
already present in the environment take precedence, which is how CI points at its own services.

## Container image

Built from the **repository root**, because the npm workspace lockfile lives there:

```bash
docker build -f apps/api/Dockerfile -t pethouse-api .
docker run --rm -p 3000:3000 --env-file apps/api/.env pethouse-api
```

The image runs `node dist/main` as the unpublished `node` user, with production dependencies
only, and declares a `HEALTHCHECK` on `/api/health`.
