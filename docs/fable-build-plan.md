# Pethouse — Build Plan & Fable Prompts

How to use this file: paste the **Preamble** followed by **exactly one phase** into a Fable
session. One phase = one working session = one or more pull requests. Never paste several phases at
once — the whole point of the split is that you validate the structure before each one.

Phases 0–4 live in `apps/api`, 5–7 in `apps/mobile`. Phase 3 of the API and Phase 5 of the
app can overlap once the OpenAPI contract for auth is stable.

---

## Preamble — paste at the top of every session

> You are working on **Pethouse**, an aquarium / terrarium / paludarium tracker. The core
> feature is **routines**: recurring maintenance tasks (water change, fertiliser, feeding,
> misting) that push a notification to every member of a household when they are due.
>
> Before doing anything:
> 1. Read `CLAUDE.md` at the repository root, then the one in the workspace you are working in
>    (`apps/api/CLAUDE.md` or `apps/mobile/CLAUDE.md`). Both are binding, not advisory.
> 2. Read `docs/architecture.md` for the domain model and the locked technical decisions. Do not
>    re-open a decision recorded there without asking me first.
>
> Non-negotiables, repeated here because they are the ones most often dropped:
> - **Show me the file structure and the schema before writing any code. Wait for my explicit
>   go-ahead.**
> - **Ask when in doubt.** Do not guess at scope.
> - **No `any`**, including behind an `eslint-disable`. If you cannot type it, ask.
> - **Everything in the project is written in English** — code, comments, docs, commits, pull requests.
>   We talk in French; the repo does not.
> - **Conventional commits with a scope**, no Claude signature, no `Co-Authored-By`.
> - **Work through GitHub pull requests**, never directly on `main`.
> - **A PR is done only once build + lint + tests have actually run and the affected surface
>   has been exercised for real.** Report what passed, explicitly. "Should work" is not a result.
>
> Work phase by phase. At the end of a phase, summarise what shipped and stop — do not start
> the next one on your own initiative.

---

# API — `apps/api`

## Phase 0 — Bring the bootstrap up to standard

The repo is bootstrap-stage and two things are outright broken. Fix the foundation before any
feature lands on top of it. No domain work in this phase.

**Scope**

1. **ESLint** — migrate the legacy `.eslintrc.js` to flat config (`eslint.config.js`) for
   ESLint 9. Preserve the existing rule set as-is; it is deliberate. `eslint-plugin-nestjs` is
   unmaintained since 2019 — drop it and tell me what coverage is lost, do not silently
   substitute something else. `npm run lint` must exit 0.
2. **TypeScript** — enable `strict`, `strictNullChecks`, `noImplicitAny`,
   `forceConsistentCasingInFileNames`. Fix the resulting errors properly; a non-null assertion
   used to silence the compiler is the same sin as `any`.
3. **Delete the `tank` module entirely** — `src/modules/tank/` is scaffolding placeholder used
   to exercise the generator, not the real Tank module. It goes away here; the real one is
   built in Phase 2 from the validated schema. Same for `app.controller` / `app.service`
   ("Hello World!"), replaced by a proper `/health` endpoint.
4. **Tests** — set up the Jest config for three suites: unit, integration, e2e, with
   `coveragePathIgnorePatterns` excluding modules, DTOs, entities, migrations and `main.ts`.
5. **Dependencies** — remove `@nestjs/typeorm` (unused, MikroORM is the ORM).
6. **Bootstrap hardening** — global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`,
   `transform`), global exception filter, `class-validator` + `class-transformer`, CORS driven
   by a `CORS_ORIGINS` env var, `/api` global prefix.
7. **Swagger** — `@nestjs/swagger`, UI on `/docs`, spec on `/docs-json`. **Leave the CLI plugin
   disabled** — explicit `@ApiProperty` is the rule.
8. **Config** — extend the existing typed `registerAs` pattern to database, JWT, Redis, S3 and
   push config. Add env var validation at boot so a missing variable fails fast with a clear
   message instead of a null at runtime. Update `.env.exemple`.
9. **Migrations** — create `src/migrations/` and `src/seeders/`; the config already points at
    them and neither exists. No initial migration to generate in this phase since the
    placeholder entity is gone — the first real migration lands in Phase 1.
10. **Docker** — multi-stage `Dockerfile` (non-root user, `.dockerignore`) and a
    `docker-compose.yml` for local dev with MySQL, Redis and MinIO.
11. **Fix the module generator** — `src/commands/generate-module.ts` has a hard-coded
    `'./tank.entity'` import in its repository template, and the repository it generates is
    never registered in the module. Update it to emit the conventions in `CLAUDE.md`
    (controller/service/repository/entity/dto layers, response DTOs, module registration).
12. **Make CI green.** `.github/workflows/api.yml` is **already committed** and describes the
    target state: `lint`, `build`, `test`, `test-e2e` against real MySQL and Redis, and an
    `openapi` job that uploads the spec. Do not weaken the workflow to make it pass — make the
    code satisfy it. Two things it expects that do not exist yet: the `typecheck` script (item 2
    above) and `src/commands/dump-openapi.ts` backing `npm run openapi:dump`, which must boot
    the Nest app without listening, write the spec to `apps/api/openapi.json`, and exit 0. Once
    the workflow is green, tell me to enable the branch protection rule on `main` requiring
    these checks — that is a GitHub setting I have to flip, not something you can commit.

**Out of scope:** auth, any new entity, anything touching the domain.

**Done when:** `npm run lint`, `npm run build`, `npm test` and `npm run test:e2e` all pass
locally and in CI; `docker compose up` brings up a working stack; `/docs` renders.

---

## Phase 1 — Auth, users, households

**Scope**

- `users`, `refresh_tokens` — registration (email + password, argon2), login, refresh, logout,
  `GET /api/users/me`, `PATCH /api/users/me` (display name, `preferred_language`).
- JWT access + refresh with Passport. Access short-lived, refresh rotated and revocable.
  `JwtAuthGuard` global with an `@Public()` decorator for the opt-outs.
- `households` (including a `timezone` column — see Phase 4, all routine scheduling resolves
  against it), `household_members` (roles `OWNER` / `MEMBER`), `household_invites`.
- Invitation flow: an owner generates a **code/link** (`pethouse://invite/<code>`) with an
  expiry and a max use count; a logged-in user redeems it and becomes a `MEMBER`. No email,
  no SMTP.
- A **household membership guard**: every resource downstream is scoped to a household, and a
  user who is not a member gets a 404, not a 403 — do not leak the existence of other
  households.
- A household is created automatically on registration so a new user always has one.

**Explicitly ask me before implementing:** whether an `OWNER` can leave or transfer ownership,
and what happens to a household when its last owner leaves.

**Done when:** the full flow works against the real API — register → create tank-less household
→ generate invite → second account redeems it → both accounts see the same household; e2e tests
cover the guard behaviour; every endpoint has a typed response DTO in `/docs-json`.

---

## Phase 2 — Tanks, subtypes, catalogue, photos

**Scope**

- `tank_subtypes` (system list seeded per tank type + household-scoped custom subtypes),
  `tanks`, `tank_photos`. `tank_type` is a **fixed enum** — `AQUARIUM`, `TERRARIUM`,
  `PALUDARIUM` — and never becomes a table.
- Catalogue as **two fully separate table families** — `animal_species` + `animal_species_names`
  and `plant_species` + `plant_species_names`. No shared base, no discriminator, no inheritance:
  a column relevant only to plants must never appear on an animal. Two sets of endpoints
  (`/api/animal-species`, `/api/plant-species`). Present the MikroORM entity definitions and
  wait for validation before writing them.
- `tank_animals` and `tank_plants` — two link tables, each with a quantity, `added_at` and a
  nullable `removed_at`. Do not attempt to unify them behind a polymorphic relation.
- Seeder for a starter catalogue: roughly 100 common freshwater species and 50 aquatic plants,
  with FR and EN common names. Idempotent (`em.upsert`), re-runnable.
- Photo upload to MinIO via **pre-signed URLs** — the image must not transit through the API.
  Endpoint returns an upload URL; the client PUTs directly; a second call registers the key.
  Set the bucket read policy at init.

**Done when:** a household can create a tank of each type, attach a custom subtype, add species
and plants from the catalogue, and upload a photo that is publicly readable.

---

## Phase 3 — Parameters & measurements

**Scope**

- `parameter_definitions` seeded with pH, KH, GH, NO2, NO3, NH4, temperature, TDS, salinity —
  each with a unit and a decimal precision. Households can add their own definitions.
- `user_parameter_settings`: enabled / display order / thresholds **per user and per tank type**
  — this is the default every tank of that type inherits. Sensible defaults on first access.
- `tank_parameter_overrides`: a tank can **add or remove individual parameters for itself**, on
  top of the account default. An override row exists only where a tank actually deviates;
  absence of a row means "inherit". Changing the account setting must therefore still propagate
  to every tank that never deviated — verify this explicitly, it is the whole point of the
  two-layer design.
- A single endpoint returning the **resolved** set for a tank (`GET /api/tanks/:id/parameters`).
  No client should ever merge the two layers itself.
- `measurements`: value, `measured_at`, `recorded_by`, optional note. History endpoint with a
  date range, aggregation suitable for charting.

- **Out-of-range values are an in-app visual signal only, never a push notification** — push is
  reserved for routines. The API's job is simply to return the thresholds alongside the values
  so the client can render the alert state. Do not build an alert entity, an `is_critical` flag,
  or any notification path here.

**Done when:** a user configures their parameter set once for `AQUARIUM`, every aquarium picks
it up, one specific aquarium adds a parameter the others do not have, and changing the account
default still moves all the non-deviating tanks.

---

## Phase 4 — Routines, scheduler, push notifications

The core of the product. Take it in three pull requests, not one.

### 4a — Routine model and occurrences

- `routines` (RRULE, dtstart, active flag, per-routine reminder settings) and
  `routine_occurrences` with `UNIQUE (routine_id, scheduled_for)`. **Timezone comes from the
  household, not the routine and not the user** — "every Monday at 09:00" must mean the same
  wall-clock time for every member. Expand RRULEs against `households.timezone`, store
  occurrences in UTC, and make sure a DST transition does not shift a routine by an hour.
- RRULE parsing and expansion with the `rrule` library. A preview endpoint returning the next
  N occurrences — the app needs it to show "next: Thursday 12 March".
- `routine_templates`: system routines suggested per tank type at tank creation
  (water change, filter cleaning, fertiliser, misting, feeding…). Propose the list and let me
  validate it.
- Completion: `POST /api/routine-occurrences/:id/complete` recording `completed_at` and
  `completed_by`. **The next occurrence is always derived from the RRULE, never from the
  completion date** — completing late does not shift the schedule. Also `/skip`.
- History endpoint: who did what, when, per tank and per routine.

### 4b — Scheduler

- BullMQ + Redis. A repeatable job materialises occurrences over a rolling 30-day window from
  each active RRULE; materialisation is idempotent thanks to the unique constraint.
- A second job dispatches occurrences that have come due, and schedules the per-routine
  reminder escalation (`reminder_repeat_minutes`, `reminder_max_repeats`) as delayed jobs. An
  occurrence completed in the meantime cancels its pending reminders.
- Occurrences that pass their window uncompleted flip to `MISSED`.
- **Must be safe with multiple k3s replicas** — no double-send. This is why Redis is here
  rather than `@nestjs/schedule`.

### 4c — Expo Push delivery

- `device_tokens`: register / refresh / revoke an Expo push token per user and platform.
- `notification_deliveries`: Expo Push is two-step — sending returns a *ticket*, and receipts
  must be polled afterwards. Implement the receipt poll and prune tokens that come back
  `DeviceNotRegistered`. Skipping this is how push silently rots.
- Notification payload carries a deep link (`pethouse://tanks/<id>/routines/<id>`) and an
  **action category with a "Done" button** so the occurrence can be completed from the
  notification shade without opening the app.
- Fan-out to **every member of the household**, not just the routine's creator.
- Notification text is localised per recipient using their `preferred_language`.

**Done when:** a routine created with an RRULE of "every 2 days at 19:00" actually delivers a
push to two different accounts in the same household, the "Done" action completes the
occurrence, the completion is visible in the history, and the reminder escalation fires when
nobody acts.

---

# Mobile — `apps/mobile`

## Phase 5 — Scaffold

`apps/mobile` is still the unmodified `react-navigation/template` starter. There is nothing to
preserve; there is also no reason to `create-expo-app` from scratch and lose the git history.

**Scope**

- Migrate to **expo-router** (file-based). Delete the starter screens and its leftover README.
- **Metro in a monorepo** — this is the one real friction point of the workspace layout. Metro
  must resolve `@pethouse/api-client` and the hoisted `node_modules` at the repository root:
  `metro.config.js` needs `watchFolders` pointing at the workspace root and
  `resolver.nodeModulesPaths` covering both the app's and the root's `node_modules`. Get this
  working before anything else in the phase — every later step depends on it.
- Fix `app.json`: add `android.package` and `ios.bundleIdentifier`, correct the deep-link
  scheme (the current prefix is `helloworld://` while the scheme is `pethouse`).
- `eas.json` with `development`, `preview` and `production` profiles, and the EAS monorepo
  settings so a build from `apps/mobile` picks up the root lockfile. Android is the priority;
  keep iOS buildable.
- Tooling the workspace has none of: ESLint (flat config, mirroring the API's strictness where
  it makes sense for RN), Prettier, Jest + React Native Testing Library, Maestro for e2e. A
  `typecheck` script already exists.
- **i18n from day one**, French primary, English maintained alongside. No hard-coded
  user-facing string, ever.
- Design tokens + a small set of themed primitives. Propose a direction and show it to me
  before building the set — I want an identity, not default React Native grey.
- **Build `packages/api-client`**: `openapi-typescript` + `openapi-fetch` over the spec produced
  by `npm run openapi:dump --workspace @pethouse/api`, exposed behind
  `npm run generate --workspace @pethouse/api-client` (reachable as `npm run generate:client`
  from the root). Generate with `--default-non-nullable false`. **The output is committed.**
  Then flip `.github/workflows/contract.yml` from `workflow_dispatch` to `pull_request` — it is
  already written and commented for exactly this moment.
- TanStack Query v5 on top of the generated client, hooks per feature.
- Auth flow: register / login / refresh, token storage in `expo-secure-store`, an authenticated
  route group and a public one.
- Make `.github/workflows/mobile.yml` green. It is already committed; do not weaken it.

**Done when:** the app builds and runs on an Android emulator, a user can register and log in
against the real API, the language switch changes the whole UI, and the `contract` workflow
fails if you deliberately edit a DTO without regenerating the client (verify that — a contract
check that does not actually catch drift is worse than none).

---

## Phase 6 — Feature screens

Follow the API phases. One pull request per feature area, each shown to me as a screen structure before
implementation.

- **Households** — current household, member list, generate and share an invite link, redeem an
  invite from a deep link.
- **Tanks** — list, create (type → subtype → volume/dimensions → substrate), detail, photo
  gallery with pre-signed upload, inhabitants (search the catalogue, add with a quantity) with
  animals and plants presented as two distinct sections.
- **Parameters** — account-level configuration per tank type, per-tank add/remove on top of it,
  quick entry of a measurement from the tank detail, history charts with the acceptable range
  drawn as a shaded band. Out-of-range values render in an alert colour and put a warning badge
  on the tank card — **no notification.**
- **Routines** — list per tank, create from a template or from scratch, an RRULE editor that a
  human can actually operate (not a raw string field), next-occurrence preview, reminder
  settings, completion history showing who did what.
- **Notifications** — push token registration and refresh, permission request flow, the "Done"
  action category, deep-link handling for cold start / background / foreground, and an
  in-app view of upcoming and overdue tasks.

The notification handling is the part most likely to be quietly broken. Verify all three launch
states on a real emulator, not just the foreground case.

---

## Phase 7 — Android delivery

- EAS build profiles finalised, signing configured, versioning strategy. Enable the
  `android-build` job in `.github/workflows/mobile.yml` — it is already written and needs an
  `EXPO_TOKEN` repository secret, which I have to add.
- Internal-testing track on Google Play, or a distributed APK — tell me which you need from me.
- **API image published to GHCR** from a GitHub Actions job (`ghcr.io/<owner>/pethouse-api`),
  tagged by commit SHA. Never `latest`.
- API deployed to the k3s homelab: manifests, Sealed Secrets, ArgoCD application, Traefik
  ingress with TLS. MySQL and Redis on `local-path` storage, **never NFS** — file locking
  breaks on it. MinIO for the photo bucket. `nodeSelector` on every workload (the cluster is
  mixed amd64 / ARM64).
- Crash reporting, and the `/health` endpoint from Phase 0 wired to real liveness and readiness
  probes.
- The scheduler must stay correct at more than one replica — if the deployment scales, verify no
  notification is sent twice.

---

## Post-V1

- **Back-office**: a React Admin app in `apps/admin`, against secured admin-role routes on the
  existing API, for curating the animal species and plant catalogues.
- Public API imports for species and plant data instead of the seeded list.
- Per-individual tracking (a named animal, with its own history).
- iOS release once a test device is available.
