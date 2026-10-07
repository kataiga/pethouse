# Pethouse App — Working Rules

Expo SDK 52 + React Native 0.76 + expo-router. Mobile client for Pethouse, an aquarium /
terrarium / paludarium tracker whose core feature is recurring maintenance routines delivered
as push notifications.

This is the `apps/mobile` workspace of the Pethouse monorepo. **`/CLAUDE.md` at the repository
root applies here too** — process, commit conventions, the ban on `any`. This file adds what is
specific to the mobile app. Both are binding.

Domain model and locked technical decisions: **`/docs/architecture.md`. Read it before designing
anything.**

**Android is the delivery priority.** iOS must stay buildable — do not introduce Android-only
APIs without an iOS fallback — but it is not tested (no device available).

---

## Process

### Show the structure before writing code
For any new feature, present the file tree and the screen/navigation structure first, in text,
and wait for an explicit go-ahead.

### A PR is not finished until it has been run
Before declaring a PR done, run and report explicitly:

```bash
npm run lint      --workspace @pethouse/mobile
npm run typecheck --workspace @pethouse/mobile
npm run test      --workspace @pethouse/mobile
```

Then launch the app on an Android emulator and exercise the affected screens for real. Saying
"should work" is not a validation — state what actually passed.

A screen verified only in the Expo web target is **not** verified. Notification behaviour in
particular does not exist on web.

---

## Conventions

### Language — two distinct meanings, do not confuse them
- **Source language: English.** Code, comments, README, PR titles and descriptions, commit
  messages. Conversation may be in French; artefacts may not.
- **UI language: i18n from day one, French primary.** No user-facing string is ever hard-coded
  in a component — every one goes through a translation key, with `fr` and `en` catalogues
  maintained together. A key added without its French *and* English value is incomplete.

---

## Hard rules

Commit conventions and the general ban on `any` are in `/CLAUDE.md`. What follows is the
mobile-specific detail.

### API types are generated, never hand-written
The typed client is generated from the API's OpenAPI spec (`/docs-json`) via
`openapi-typescript` + `openapi-fetch`. **Never hand-write a request or response type, and
never patch the generated file.** If a response is untyped or the wrong shape, the fix belongs
in the API's response DTOs, not here.

Regenerating the client is its own commit: `chore(api): regenerate client`.

Known trap: generate with `--default-non-nullable false`, otherwise fields carrying a server
`@default` come out required and the client is forced to send them explicitly.

### Routing is file-based
expo-router. Every screen reachable from a notification must be addressable by URL
(`pethouse://tanks/42/routines/7`). Do not add manual linking configuration to work around a
route that should exist as a file.

### Data layer
TanStack Query v5, hooks grouped per feature (`useTanks`, `useRoutines`, …). No local
persistence — the app is **online only**, so every screen needs an explicit loading, empty and
error state. A screen that renders nothing while offline is an incomplete screen.

Any mutation that changes what a household owns or schedules must invalidate the query keys of
every view that displays it, not only its own.

---

## Testing strategy

- **Unit / component → Jest + React Native Testing Library**
- **E2E → Maestro** (chosen over Detox for Expo/EAS friendliness)
- Complementary, never substitutes.

**No 100% coverage target.** Prioritise business logic, error branches and edge cases. Exclude
purely declarative files from coverage: route files that only compose, theme tokens, generated
API client, i18n catalogues.

---

## Architecture

```
app/                      # expo-router routes — thin, they compose features
src/
├── features/
│   ├── auth/             # components/ hooks/ api/ types/ per feature
│   ├── households/
│   ├── tanks/
│   ├── catalog/          # animal species and plants — two sections, two API surfaces
│   ├── parameters/
│   └── routines/
├── components/ui/        # shared primitives, themed
├── lib/
│   ├── api/              # queryClient + the fetch wrapper around @pethouse/api-client
│   ├── i18n/
│   └── notifications/    # Expo push registration, categories, action handlers
└── theme/                # design tokens
```

The typed client itself lives in `packages/api-client`, not here. `lib/api/` only holds the
thin layer that attaches the auth token and configures TanStack Query.

Path aliases (`@/features`, `@/components`, `@/lib`). Route files stay thin: they wire a
feature component to a URL, they do not hold business logic.

A component only moves up into `components/ui/` on **real duplication**, not on speculation.

---

## Known state of the repo

This is still the unmodified `react-navigation/template` starter. Every screen renders
`<Text>X Screen</Text>`. Things that must be fixed as part of the first phase (see
`gestion/prompts/fable-build-plan.md`):

- No `android.package` in `app.json` → EAS Android build is impossible as-is
- No `eas.json`, no EAS project configured
- Deep-link prefix in `src/App.tsx` is still `helloworld://` while the scheme is `pethouse`
- `expo-notifications` is absent — the core feature has no foundation
- No ESLint, no Prettier, no tests, no test runner, no typecheck script
- No API client, no state management, no i18n, no design system
- README is still the starter template's
