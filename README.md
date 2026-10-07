# Pethouse

A tracker for aquariums, terrariums and paludariums.

Create your tanks, record what lives in them, log water parameters over time, and — the point
of the whole thing — set up **maintenance routines** that notify every member of your household
when a water change, a dose of fertiliser or a feeding is due.

> **Status: bootstrap.** The API is a NestJS scaffold and the mobile app is still close to the
> Expo starter template. See `docs/fable-build-plan.md` for the phased plan and
> `docs/architecture.md` for the domain model.

## Features

- **Tanks** — aquarium, terrarium or paludarium, with subtypes, dimensions, substrate and photos
- **Inhabitants** — animal species and aquatic plants from a catalogue, with quantities
- **Parameters** — pH, KH, GH, NO2, NO3, NH4, temperature and more, configured once per account
  and per tank type, overridable per tank, with history charts and acceptable-range bands
- **Routines** — recurring tasks on an iCalendar recurrence rule, push notifications to the
  whole household, a "Done" button right in the notification, and a history of who did what
- **Households** — share your tanks with other people by invite link, no email required

## Repository layout

```
apps/
  api/                 NestJS 11 · MikroORM 6 · MySQL · BullMQ · Expo Push
  mobile/              Expo SDK 52 · React Native 0.76 · expo-router · TanStack Query
packages/
  api-client/          Typed client generated from the API's OpenAPI spec
docs/
  architecture.md      Domain model and locked technical decisions
  fable-build-plan.md  Phased build plan
```

Android is the delivery priority. iOS stays buildable but is untested.

## Getting started

Requires Node 22+ and Docker.

```bash
npm ci                              # installs every workspace
cd apps/api && cp .env.exemple .env
docker compose up -d                # MySQL, Redis, MinIO
npm run mikro:up                    # migrations
cd ../.. && npm run api             # API on http://localhost:3000
```

API documentation is served on `/docs`, and the raw OpenAPI spec on `/docs-json` — that spec is
what `packages/api-client` is generated from.

For the mobile app:

```bash
npm run generate:client             # typed client from the running API
npm run mobile:android
```

## Useful scripts

Run from the repository root:

| Command | What it does |
|---|---|
| `npm run lint` | Lints every workspace |
| `npm run typecheck` | Type-checks every workspace |
| `npm test` | Unit tests across every workspace |
| `npm run api:test:e2e` | API end-to-end tests (needs the Docker services up) |
| `npm run api` | Starts the API in watch mode |
| `npm run mobile` | Starts the Expo dev server |
| `npm run generate:client` | Regenerates the typed API client |

Target a single workspace with `npm run <script> --workspace @pethouse/api`.

## Contributing

Read `CLAUDE.md` first — it is the working agreement, not a suggestion. In short: conventional
commits with a scope, no `any`, everything written in English, work through pull requests, and a
PR is only done once its checks have actually been run.
