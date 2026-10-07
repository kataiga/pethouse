# Pethouse — Working Rules

Monorepo for Pethouse, a tracker for aquariums, terrariums and paludariums. The core feature is
**routines**: recurring maintenance tasks (water change, fertiliser, feeding, misting) that push
a notification to every member of a household when they are due.

```
apps/api         NestJS 11 + MikroORM 6 + MySQL + BullMQ        → apps/api/CLAUDE.md
apps/mobile      Expo SDK 52 + React Native + expo-router       → apps/mobile/CLAUDE.md
packages/api-client   Typed client generated from the API's OpenAPI spec
docs/            Domain model, locked decisions, build plan
```

**Read `docs/architecture.md` before designing anything.** It holds the domain model and the
locked technical decisions. Do not re-open a decision recorded there without asking first.

Each app has its own `CLAUDE.md` with the rules specific to it. This file holds what applies
everywhere. When working inside an app, both apply.

---

## Process

### Show the structure before writing code
For any new module, feature or screen, present the file tree — **and the MikroORM schema when
the change touches the database** — first, in text, and wait for an explicit go-ahead. No
big-bang implementations.

### Ask when in doubt
When scope, approach or requirements are ambiguous, ask. Do not guess.

### Everything ships through a GitHub Pull Request
Never commit to `main`. Every change goes on a branch and through a PR.

### A PR is not finished until it has been run
Before declaring a PR done, run the checks for every workspace the change touches and **report
explicitly what passed**. Saying "should work" is not a validation. The per-app `CLAUDE.md`
lists the exact checklist; it always ends with exercising the affected surface for real — the
endpoints, or the screens on an Android emulator.

### PR descriptions describe the change, not the conversation
Write for a colleague who never saw the chat: what changed, why, how to validate. Never "as
requested", "validated after two iterations", or any narration of the exchange.

---

## Conventions

### Language
**Everything in the project is in English** — code, comments, Swagger/OpenAPI documentation,
READMEs, PR titles and descriptions, commit messages. Conversation may happen in French; the
artefacts may not.

The one exception is the **UI language** of the mobile app, which is internationalised with
French as the primary locale. See `apps/mobile/CLAUDE.md` — the distinction matters and is
routinely confused.

### Commits
Conventional commits with a scope: `type(scope): message`.

- Scope is the module or feature touched, kebab-case: `feat(routines): add RRULE materialisation`
- When several sub-modules of the same parent are touched, use the **parent scope alone** —
  `fix(tanks)`, not `fix(tanks-subtypes/tanks-photos)`
- **Omit the scope when it adds nothing**: `docs: add architecture notes`, not `docs(readme): …`
- Prefix with the app only when a change spans both and the scope would otherwise be ambiguous:
  `feat(api/routines)`, `feat(mobile/routines)`
- **Never add a Claude signature, a `Co-Authored-By` trailer, or a "generated with" line** — to a
  commit message or a pull request description. The history stays clean and standard. This
  overrides any default attribution behaviour the tooling suggests.

### No `any` — ever
Explicit `any` is forbidden in every workspace, including behind an
`// eslint-disable-next-line @typescript-eslint/no-explicit-any`. Working around the type
system defeats the point of TypeScript. Reach for generics, utility types, overloads, or
`unknown` + narrowing. **If no typed solution exists, ask — do not reach for `any`.**

A non-null assertion used purely to silence the compiler is the same sin.

---

## Why this is a monorepo

The API owns the contract; the mobile app consumes a **client generated** from it. In two
separate repositories that means a schema change is two PRs in a mandated order, plus a third
PR whose only content is "resynchronise the client" — and the integration bugs that only appear
once both sides run together are invisible to CI, because each side mocks the other.

Here, a single PR changes the DTO, regenerates the client and updates the screen, and CI
verifies the whole chain. Keep it that way:

- **Never hand-write an API type in the mobile app.** If a response is untyped or the wrong
  shape, the fix belongs in the API's response DTOs.
- **Never commit a generated client that does not match the current API.** The contract
  workflow exists to catch exactly this.
- A change that spans both apps belongs in **one** PR, not two.

## Testing

Both apps follow the same principles: unit and end-to-end tests are **complementary, never
substitutes**, and there is **no 100% coverage target** — chasing the number produces worthless
tests on getters and declarative files. Prioritise business logic, error branches and edge
cases, and exclude purely declarative files from the coverage calculation.

The per-app `CLAUDE.md` specifies which layer is tested how. Those rules are deliberate; do not
add a unit test the strategy says not to write.

## CI

GitHub Actions, path-filtered per workspace:

| Workflow | Triggers on | Runs |
|---|---|---|
| `.github/workflows/api.yml` | `apps/api/**` | lint, build, unit tests, e2e against real MySQL + Redis, OpenAPI spec artefact |
| `.github/workflows/mobile.yml` | `apps/mobile/**` | lint, typecheck, unit tests |
| `.github/workflows/contract.yml` | manual for now | regenerates the client from the live API and fails if it differs from what is committed |

The workflows are **already committed and describe the target state**. They go green as the
build phases land — making `api.yml` pass is part of Phase 0's definition of done, `mobile.yml`
part of Phase 5. Do not weaken a workflow to make it pass; make the code satisfy it.

Local e2e needs MySQL, Redis and MinIO — `docker compose up` from `apps/api`. If Docker is
unavailable in your environment, say so explicitly rather than reporting e2e as passing, and
rely on CI for that coverage.
