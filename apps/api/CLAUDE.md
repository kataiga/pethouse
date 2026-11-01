# Pethouse API — Working Rules

NestJS 11 + MikroORM 6 + MySQL. Backend for Pethouse, an aquarium / terrarium / paludarium
tracker whose core feature is recurring maintenance routines that push notifications to every
member of a household.

This is the `apps/api` workspace of the Pethouse monorepo. **`/CLAUDE.md` at the repository root
applies here too** — process, commit conventions, the ban on `any`, the language rule. This file
adds what is specific to the API. Both are binding.

Domain model and locked technical decisions: **`/docs/architecture.md`. Read it before designing
anything.** Do not re-litigate a decision recorded there without explicit approval.

---

## Process

### Show the structure before writing code
For any new module or significant feature, present the file tree **and the MikroORM schema**
first, in text, and wait for an explicit go-ahead. No big-bang implementations.

### A PR is not finished until it has been run
Before declaring a PR done, run and report explicitly:

```bash
npm run lint      --workspace @pethouse/api
npm run typecheck --workspace @pethouse/api
npm run build     --workspace @pethouse/api
npm run test      --workspace @pethouse/api
npm run test:e2e  --workspace @pethouse/api   # when routes, guards or DTOs change
```

Then start the server and exercise the affected endpoints for real. Saying "should work" is not
a validation — state what actually passed.

E2E needs MySQL, Redis and MinIO: `docker compose up -d` from this directory. If Docker is
unavailable in your environment, **say so explicitly** rather than reporting e2e as passing, and
rely on CI for that coverage.

Known trap: after a build, restart the process before smoke-testing. A stale `dist` in memory
produces phantom bugs.

---

## Hard rules

Commit conventions, the language rule and the general ban on `any` are in `/CLAUDE.md`. What
follows is the API-specific detail.

### No `any` — ever
Explicit `any` is forbidden, including behind
`// eslint-disable-next-line @typescript-eslint/no-explicit-any`. Working around the type
system defeats the point of TypeScript.

Reach for generics, MikroORM utility types (`FindOptions<T, Hint>`, `FilterQuery<T>`,
`Loaded<T, Hint>`), overloads, or `unknown` + narrowing. **If no typed solution exists, ask —
do not reach for `any`.** This bites hardest in repositories; the known bad pattern is
`options: object` + `as any`.

### The API contract is typed for the client generator
The app generates its client from `/docs-json`. Every endpoint must expose the **schema of its
success response**, not just a description.

- Create **dedicated response DTOs** decorated with `@ApiProperty` / `@ApiPropertyOptional`,
  and reference them via `@ApiResponse({ status, type })`.
- Response DTOs are **decoupled from MikroORM entities**. Never expose an ORM entity as the
  public API contract. Use a static `fromEntity` factory on the DTO.
- The `@nestjs/swagger` CLI plugin stays **disabled on purpose** → explicit `@ApiProperty` is
  mandatory. Primitives are inferred through `emitDecoratorMetadata`, but arrays and nested
  objects need `type: () => [Dto]`.
- Pagination uses a concrete wrapper DTO: `{ data: XDto[], total, page, limit }`.
- Mark `@ApiPropertyOptional` any field or relation only populated on some routes.
- Never leak back-references or raw FKs (`user: 4`) — one entity, one response shape across
  POST / GET / PATCH.

### Never expose an entity relation you have not deliberately shaped
A `hidden: true` relation silently disappearing from a response is a bug that only shows up at
runtime. Verify the actual JSON, not the TypeScript type.

---

## Testing strategy

- **Services → unit tests** with the repository mocked.
- **Controllers → e2e tests only.** A controller that just delegates (`return this.tanks.findAll(dto)`)
  gains nothing from a unit test with a mocked service; the e2e test covers the delegation
  *plus* the JWT guards, DTO validation and serialisation, end to end. Do not write both.
- Guards, strategies, decorators and repositories are covered by e2e against a real test DB.
- Unit and e2e are **complementary, never substitutes**.

**No 100% coverage target.** Chasing the number produces worthless tests on getters and DTOs.
Prioritise business logic, error branches and edge cases. Exclude purely declarative files
from the coverage calculation via `coveragePathIgnorePatterns`: modules, DTOs, entities,
migrations, `main.ts`.

---

## Architecture

Feature modules under `src/modules/<feature>/`, each with `controller/`, `service/`,
`repository/`, `entity/`, `dto/` and its own Nest module. Cross-cutting code lives in
`src/core/` (logger, guards, filters) and `src/common/` (enums, utility types, decorators).
Use TypeScript path aliases (`@core`, `@common`, `@modules/...`) rather than `../../..`.

`npm run generate:module <name>` scaffolds a module. If the generated output no longer matches
these conventions, **fix the generator**, do not hand-patch its output.

### Migrations
Every schema change ships with a MikroORM migration in the same pull request. Never rely on
`schema:update` outside local scratch work.

---

## Known state of the repo

Phase 0 of `/docs/fable-build-plan.md` is done: the toolchain, bootstrap, configuration and Docker
setup below are in place. No domain module exists yet; the first one lands in Phase 1.

### What is in place

- **Tooling.** ESLint 9 flat config (`eslint.config.mjs`, style rules from `@stylistic`), strict
  TypeScript, path aliases (`@core`, `@common`, `@modules`, `@config`), Jest split into `unit`,
  `integration` (`*.int-spec.ts`, real database, no HTTP) and `e2e` projects in `jest.config.ts`.
- **Bootstrap.** `src/bootstrap/create-app.ts` is the single HTTP pipeline: `/api` prefix,
  `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), the global
  `HttpExceptionFilter` producing `ErrorResponseDto` for every error, CORS from `CORS_ORIGINS`,
  Swagger on `/docs` and `/docs-json`. `main.ts`, the OpenAPI dump and the e2e suite all use it.
- **`AppModule.forRoot(options)`.** The root module is dynamic so tooling can boot the module
  graph without a database (`connectDatabase: false`) or with specific env files (`envFiles`).
- **Health.** `GET /api/health` on `@nestjs/terminus`, same `HealthResponseDto` body on 200 and 503.
- **Configuration.** One `registerAs` family per concern in `src/config/` (`app`, `logger`,
  `database`, `jwt`, `redis`, `s3`, `push`), every variable validated at boot by
  `src/config/environment.ts`. `.env.exemple` documents them; `.env.test` is committed and loaded
  under `NODE_ENV=test`, real environment variables always win. MikroORM is configured by
  `buildMikroOrmConfig()` after validation, and the CLI gets the same config through a factory.
- **OpenAPI dump.** `npm run openapi:dump` writes `openapi.json` without a database, which is what
  the CI `openapi` job and the `contract` workflow run.
- **Docker.** `Dockerfile` (multi-stage, non-root, built from the repository root) and
  `docker-compose.yml` with MySQL, Redis and MinIO for local development.

### Conventions settled in Phase 0

- **Response DTOs take their values through a constructor** (and a `fromEntity` / `fromResult`
  factory). They never need a definite-assignment marker.
- **Framework-hydrated classes** (MikroORM entities, class-validator input DTOs, the environment
  schema) declare their fields with the definite-assignment marker (`id!: number`): the framework
  assigns them, and that is what the marker states. It is not the non-null assertion `value!`
  on an expression, which stays forbidden.
- `discovery.warnWhenNoEntities` is `false` in `buildMikroOrmConfig()` only because no entity
  exists yet. **Remove it with the first entity** in Phase 1.
- MikroORM metadata cache lives under the OS temp directory, never in the working tree.
- Migrations in the runtime image are not solved yet: `@mikro-orm/cli` is a devDependency and
  the image has no migration step. Decide the strategy in Phase 7 (init container, job, or
  startup step) rather than ad hoc.
