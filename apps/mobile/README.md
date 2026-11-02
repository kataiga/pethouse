# @pethouse/mobile

Expo SDK 52 app for Pethouse, on expo-router. Android first; iOS stays buildable.

## Run

```bash
npm ci                                   # from the repository root
cd apps/api && docker compose up -d      # MySQL, Redis, MinIO for the API
npm run api                              # API on http://localhost:3000
npm run mobile                           # Metro; open a development build on the emulator
```

`EXPO_PUBLIC_API_URL` points the app at the API. It defaults to `http://10.0.2.2:3000`, which is
the host machine as seen from the Android emulator. EAS profiles set it per build (`eas.json`).

## Checks

```bash
npm run lint --workspace @pethouse/mobile
npm run typecheck --workspace @pethouse/mobile
npm run test --workspace @pethouse/mobile
npm run export:android --workspace @pethouse/mobile   # full Metro bundle, proves module resolution
maestro test .maestro -e EMAIL=me-$(date +%s)@example.com   # on an emulator, API running
```

## Layout

- `app/`: routes, thin, each one wires a feature screen to a URL.
- `src/features/<feature>/`: screens, hooks and components per feature.
- `src/lib/api/`: the generated client from `@pethouse/api-client`, the auth middleware and the
  TanStack Query client.
- `app/(public)/` and `app/(app)/`: routes before and behind sign-in.
- `src/lib/i18n/`: French reference catalogue, English catalogue typed against it.
- `metro.config.js`: watches the repository root and resolves the hoisted `node_modules`, which
  is what lets the workspace package `@pethouse/api-client` load from source.

## Notes

- `query-string` is a direct dependency because expo-router 4 imports it without declaring it,
  and recent `@react-navigation/core` releases no longer bring it.
- Formatting is enforced by ESLint's `@stylistic` rules, the same as in `apps/api`.
