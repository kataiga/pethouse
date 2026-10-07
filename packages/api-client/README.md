# @pethouse/api-client

Typed client for the Pethouse API, **generated** from the API's OpenAPI spec. Consumed by
`apps/mobile`.

> **Not implemented yet.** This package is a declared workspace with no contents; it is built in
> Phase 5 of `docs/fable-build-plan.md`, once the API exposes typed response DTOs. The structure
> below is the target.

## How it works

1. `apps/api` serves its OpenAPI spec on `/docs-json` and can dump it to a file with
   `npm run openapi:dump --workspace @pethouse/api`.
2. This package runs `openapi-typescript` over that spec to produce `src/generated/schema.ts`,
   and wraps it with `openapi-fetch` in `src/index.ts`.
3. `apps/mobile` imports from `@pethouse/api-client` and never declares an API type of its own.

Regenerate with, from the repository root:

```bash
npm run generate:client
```

## Rules

- **The generated output is committed.** The `contract` workflow regenerates it in CI and fails
  the build if it differs from what is in the repository, so a PR that changes a DTO without
  regenerating the client cannot merge.
- **Never hand-edit a generated file.** If a response is untyped, the wrong shape, or leaks a
  raw foreign key, the fix belongs in the API's response DTOs — not here and not in the app.
- Generate with `--default-non-nullable false`. Without it, fields carrying a server-side
  `@default` come out as required and every caller is forced to send them explicitly.
- A regeneration with no other change is its own commit: `chore(api-client): regenerate`.
