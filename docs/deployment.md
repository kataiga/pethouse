# Deploying the API

The API ships as one container image. This repository builds and publishes it; the Kubernetes
manifests, secrets and ArgoCD application live in the operator's GitOps repository.

## Image

```
ghcr.io/kataiga/pethouse-api:<commit SHA>
```

- Built by the `image` job of `.github/workflows/api.yml` for `linux/amd64` and `linux/arm64`,
  on every run of that workflow; **pushed only from `main`**, after lint, build, unit and e2e
  tests passed. The job summary prints the published reference.
- Tagged by the full commit SHA only. There is no `latest`: a deployment names the exact commit.
- Runs as the non-root `node` user from `/app/apps/api`, listens on `PORT` (3000 by default),
  needs no writable path besides the system temp directory.
- The package is private by default on GHCR: either make it public in the package settings, or
  give the cluster an image pull secret with `read:packages`.

## Release steps

1. **Migrate**, once per release and before the new pods take traffic (a Job, an ArgoCD
   `PreSync` hook, or an initContainer):

   ```
   node dist/commands/migrate
   ```

   Same image, same `DB_*` variables as the API (no other variable is read). It applies pending
   migrations, then refreshes the reference data: tank subtypes, parameter definitions, the
   species catalogue and routine templates. Both steps are idempotent; a second run reports
   `Schema already up to date` and changes nothing. Exits non-zero on failure.

2. **Roll out** the API pods. Every replica may run the scheduler: jobs are taken by one worker
   each and occurrences are claimed in the database, so a notification is never sent twice.

## Probes

| Probe | Request | Meaning |
|---|---|---|
| Readiness | `GET /api/health` → `200` | The process serves requests and MySQL answers. `503` with the same body otherwise. |
| Liveness | `GET /api/health` → `200` | Same endpoint; give it a generous `failureThreshold` so a short MySQL outage does not restart every pod. |

The image also declares a Docker `HEALTHCHECK` on the same URL; Kubernetes ignores it.

## Environment variables

Every variable is validated at boot (`apps/api/src/config/environment.ts`): a missing or invalid
required one stops the process with the variable's name. Real environment variables win over any
file; the image contains no `.env`.

### Application

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | no | `development` | Set `production`: JSON logs, no query logging. |
| `PORT` | no | `3000` | |
| `LOG_LEVEL` | no | `info` | `trace` … `fatal`. |
| `CORS_ORIGINS` | no | none | Comma-separated. The Android app does not need CORS; leave empty unless a web client calls the API. |

### MySQL

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DB_HOST` | yes | | |
| `DB_PORT` | yes | | `3306` |
| `DB_USER` | yes | | |
| `DB_PASSWORD` | **secret** | empty | |
| `DB_NAME` | yes | | The database must exist; the migrate command creates the tables. |

### Redis (BullMQ scheduler)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `REDIS_HOST` | yes | | |
| `REDIS_PORT` | yes | | `6379` |
| `REDIS_PASSWORD` | **secret**, optional | none | |
| `REDIS_PREFIX` | no | `pethouse` | Key prefix of the queues; change it to share a Redis between environments. |
| `SCHEDULER_ENABLED` | no | `true` | `false` makes a replica serve HTTP only. |

### Authentication

| Variable | Required | Default | Notes |
|---|---|---|---|
| `JWT_ACCESS_SECRET` | **secret** | | At least 32 characters: `openssl rand -hex 32`. |
| `JWT_REFRESH_SECRET` | **secret** | | At least 32 characters, different from the access secret. |
| `JWT_ACCESS_TTL` | no | `15m` | |
| `JWT_REFRESH_TTL` | no | `30d` | How long a phone stays signed in without opening the app. |

Rotating either secret signs every phone out.

### Photo storage (MinIO / S3)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `S3_ENDPOINT` | yes | | **The public HTTPS URL of MinIO**, reachable from phones (see below). |
| `S3_PUBLIC_URL` | no | `S3_ENDPOINT` | Base URL phones read photos from, if it differs. |
| `S3_REGION` | no | `us-east-1` | MinIO accepts any value. |
| `S3_ACCESS_KEY` | **secret** | | A MinIO user allowed to manage the bucket. |
| `S3_SECRET_KEY` | **secret** | | |
| `S3_BUCKET` | yes | | Created at first boot if missing. |
| `S3_FORCE_PATH_STYLE` | no | `true` | Keep `true` for MinIO. |

Phones upload photos straight to MinIO through a URL the API pre-signs **with `S3_ENDPOINT`**,
and the signature covers the host name. `S3_ENDPOINT` must therefore be the address phones use
(for example `https://photos.pethouse.kataiga.fr`), and the API reaches MinIO through that same
address. An in-cluster service name would produce upload URLs no phone can open.

At boot the API creates the bucket if needed and applies a public-read policy to it: photos are
read through unguessable URLs without credentials.

### Push notifications

| Variable | Required | Default | Notes |
|---|---|---|---|
| `EXPO_ACCESS_TOKEN` | **secret**, optional | none | Only if "Enhanced push security" is enabled on the Expo project. |
| `EXPO_PUSH_URL` | no | Expo's | Tests only. |

The API sends through Expo Push, which forwards to FCM with the credentials uploaded to the EAS
project (`eas credentials`); nothing about FCM is configured on the API.

## Ingress

- `https://api.pethouse.kataiga.fr` → the API service, port 3000. The app calls `/api/*`.
  `/docs` serves the Swagger UI; restrict it at the ingress if it should not be public.
- The MinIO host chosen for `S3_ENDPOINT` → MinIO's S3 port (9000), with request bodies up to
  15 MB (the largest accepted photo).

## Mobile builds

`apps/mobile/eas.json` points the `preview` and `production` profiles at
`https://api.pethouse.kataiga.fr` through `EXPO_PUBLIC_API_URL`. The internal APK is the
`preview` profile: `eas build --profile preview --platform android`.
