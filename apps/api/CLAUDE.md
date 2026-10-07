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

Bootstrap-stage debt to clear before feature work (see the Phase 0 prompt in
`gestion/prompts/fable-build-plan.md`):

- `npm run lint` **is broken** — ESLint 9 is installed but the config is legacy `.eslintrc.js`.
  Needs migration to flat config (`eslint.config.js`). `eslint-plugin-nestjs` is unmaintained
  since 2019 and will not survive the migration as-is.
- `npm test` **fails** — `tank.controller.spec.ts` does not provide `TankService`. The whole
  `src/modules/tank/` directory is scaffolding placeholder used to exercise the module
  generator, not the real Tank module: delete it in Phase 0 and build the real one in Phase 2
  from the validated schema. `app.controller` / `app.service` ("Hello World!") go the same way,
  replaced by a `/health` endpoint.
- `tsconfig.json` is loose: `strictNullChecks: false`, `noImplicitAny: false`,
  `forceConsistentCasingInFileNames: false`. All must be enabled.
- `@nestjs/typeorm` is an unused dependency alongside MikroORM — remove it.
- `mikro-orm.config.ts` points at `src/migrations` and `src/seeders`, neither of which exists.
- The `generate:module` repository template imports `'./tank.entity'` hard-coded, and the
  generated repository is never registered in the module.
- No `ValidationPipe`, no DTOs, no `class-validator`, no Swagger, no auth, no Docker, no CI.
