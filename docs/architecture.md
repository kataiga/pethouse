# Pethouse — Architecture & Domain Model

> **Status: DRAFT — the domain model below requires explicit validation before any
> implementation starts.** Per the working rules, structure and schema come first,
> code second.

Pethouse tracks aquariums, terrariums and paludariums. The core feature is **routines**:
recurring maintenance tasks (water change, fertiliser, feeding, misting) that push a
notification to every member of the household when they are due.

## Repository layout

A single GitHub monorepo on npm workspaces.

| Workspace | Stack |
|---|---|
| `apps/api` | NestJS 11 + MikroORM 6 + MySQL + BullMQ |
| `apps/mobile` | Expo SDK 52 + React Native 0.76 + expo-router |
| `packages/api-client` | Typed client generated from the API's OpenAPI spec |
| `docs/` | This file and the build plan |
| `apps/admin` | *(post-V1)* React Admin against the API |

The API/app contract is the **OpenAPI spec** produced by `@nestjs/swagger` and served on
`/docs-json`. `packages/api-client` is generated from it and committed; the mobile app imports
from it and never hand-writes an API type.

A monorepo specifically because of that contract: a schema change touches the DTO, the
generated client and the screen, and all three belong in **one** pull request that CI validates
end to end. The `contract` workflow regenerates the client against the live API and fails the
build when the committed one has drifted.

## Locked technical decisions

| Area | Decision | Rationale |
|---|---|---|
| Notifications | Backend scheduler → Expo Push Service → FCM | Collaborative tanks require server-side fan-out; local-only notifications cannot notify other members |
| Scheduler | BullMQ + Redis (repeatable + delayed jobs) | Survives multiple k3s replicas (no double-send), gives retries and reminder escalation for free |
| Auth | Home-made JWT in Nest (Passport, access + refresh) | No external identity provider, single source of truth in MySQL |
| Recurrence | RRULE / RFC 5545 via the `rrule` library | Expresses "every 15 days" and "Mondays and Thursdays" alike; same library usable in the app for previews |
| Offline | Online only | No local persistence, no sync layer |
| Routing (app) | expo-router (file-based) | Automatic deep linking — a notification opening `pethouse://tanks/42/routines/7` needs no manual mapping |
| Photos | MinIO (S3-compatible) in the homelab, pre-signed upload URLs | Images never transit through the API; portable to any S3 later |
| Deployment | k3s homelab, GitHub Actions → ArgoCD | Existing infrastructure |
| i18n | FR primary, EN available from day one | User requirement |
| Platforms | Android first, iOS kept buildable | No iOS test device available; do not introduce Android-only APIs without an iOS fallback |
| Accounts | Mandatory account, no guest mode | Sharing model requires identity |

## Domain model

### Identity & sharing

Sharing happens at the **household** level, not per tank. A household owns tanks; its
members all see and manage every tank in it.

```
users                 id, email, password_hash, display_name, preferred_language,
                      created_at, updated_at
refresh_tokens        id, user_id, token_hash, expires_at, revoked_at
households            id, name, timezone, created_by_id, created_at
household_members     id, household_id, user_id, role (OWNER|MEMBER), joined_at
                      UNIQUE (household_id, user_id)
household_invites     id, household_id, code, created_by_id, expires_at,
                      max_uses, use_count, revoked_at
```

Invitations are **code/link based** (`pethouse://invite/<code>`) — no SMTP dependency.
`role` is deliberately a two-value enum; anything finer is out of scope.

### Tanks

```
tank_subtypes         id, tank_type (AQUARIUM|TERRARIUM|PALUDARIUM), slug, is_system,
                      household_id (NULL for system subtypes)
tanks                 id, household_id, name, tank_type, subtype_id (nullable),
                      volume_liters, width_cm, height_cm, depth_cm, substrate,
                      started_at, description, cover_photo_id, created_at
tank_photos           id, tank_id, storage_key, caption, taken_at, uploaded_by_id
```

`tank_type` is a **fixed enum** — the three types never change. Subtypes ship as a system
list per type (freshwater / planted / reef / brackish; desert / tropical / arboreal …) and a
household can add its own; a custom subtype is a `tank_subtypes` row scoped to that household,
so the tank always points at a real FK rather than a free-text column.

### Catalogue (species & plants)

**Animals and plants are two fully separate table families.** No shared base, no discriminator,
no inheritance. Each side carries its own columns and evolves without touching the other.

```
animal_species          id, scientific_name, animal_group
                        (FISH|INVERTEBRATE|REPTILE|AMPHIBIAN|ARTHROPOD),
                        image_key, min_temperature_c, max_temperature_c,
                        min_ph, max_ph, adult_size_cm, min_tank_volume_l,
                        temperament, is_system, created_at
animal_species_names    id, animal_species_id, language, common_name
                        UNIQUE (animal_species_id, language)

plant_species           id, scientific_name, image_key, light_requirement,
                        growth_rate, co2_required,
                        placement (FOREGROUND|MIDGROUND|BACKGROUND|FLOATING|EPIPHYTE),
                        min_temperature_c, max_temperature_c, min_ph, max_ph,
                        is_system, created_at
plant_species_names     id, plant_species_id, language, common_name
                        UNIQUE (plant_species_id, language)

tank_animals            id, tank_id, animal_species_id, quantity, added_at,
                        removed_at (nullable), notes
tank_plants             id, tank_id, plant_species_id, quantity, added_at,
                        removed_at (nullable), notes
```

The cost is duplication: two name tables, two link tables, two sets of endpoints
(`/api/animal-species`, `/api/plant-species`). The gain is that a field only relevant to plants
never appears on an animal, queries stay simple, and neither side can contaminate the other.
Same principle as keeping TCG tables separated per game.

Per-individual tracking (a named fish that dies) is **out of scope for V1**, but the
`quantity` + `removed_at` shape leaves room for it on both sides.

V1 ships a seeded catalogue of common freshwater species and aquatic plants. Public API
imports (à la YGOPRODeck) and the admin back-office come later; `is_system` already
distinguishes seeded rows from future user/admin contributions.

### Parameters & measurements

Parameters are configured **at the account level, per tank type** — that is the default that
every tank inherits — and each tank can then **add or remove individual parameters** for itself.

```
parameter_definitions      id, slug (ph|kh|gh|no2|no3|nh4|temperature|tds|salinity|…),
                           unit, decimals, is_system, household_id (NULL if system)
user_parameter_settings    id, user_id, tank_type, parameter_definition_id,
                           enabled, display_order, min_threshold, max_threshold
                           UNIQUE (user_id, tank_type, parameter_definition_id)
tank_parameter_overrides   id, tank_id, parameter_definition_id, enabled,
                           min_threshold, max_threshold
                           UNIQUE (tank_id, parameter_definition_id)
measurements               id, tank_id, parameter_definition_id, value,
                           measured_at, recorded_by_id, note
```

Resolution order for the parameters shown on a tank: start from the user's settings for that
tank type, then apply the tank's overrides on top. An override row exists **only** where a tank
deviates from the default — enabling a parameter the account disabled, disabling one it
enabled, or tightening a threshold. Absence of a row means "inherit". This keeps the account
setting genuinely global: changing it later propagates to every tank that never deviated.

Expose the resolved set through a single endpoint (`GET /api/tanks/:id/parameters`) so no client
ever has to merge the two layers itself.

A system set of definitions is seeded; a household may also create its own definitions.

### Routines & occurrences

```
routine_templates     id, tank_type, name_key, default_rrule, description_key, is_system
routines              id, tank_id, name, description, rrule, dtstart,
                      is_active, created_by_id,
                      reminder_repeat_minutes (nullable), reminder_max_repeats
routine_occurrences   id, routine_id, scheduled_for,
                      status (PENDING|DONE|SKIPPED|MISSED),
                      completed_at, completed_by_id, reminders_sent
                      UNIQUE (routine_id, scheduled_for)
```

Rules:

- Occurrences are **materialised ahead of time** by the scheduler (rolling window, e.g. 30
  days) from the RRULE. `UNIQUE (routine_id, scheduled_for)` makes materialisation idempotent.
- **The next occurrence is always derived from the RRULE, never from the completion date.**
  Completing a task late does not shift the schedule.
- Completion history is `completed_at` + `completed_by_id` — "who did what, when" is a
  first-class query.
- Reminder escalation is configured **per routine** in the app (`reminder_repeat_minutes`,
  `reminder_max_repeats`), not globally.
- `routine_templates` powers the suggested routines offered when a tank is created, filtered
  by `tank_type`.
- **Timezone lives on the household**, not on the routine or the user. "Every Monday at 09:00"
  means the same wall-clock time for every member. All RRULE expansion resolves against
  `households.timezone`; occurrences are stored in UTC.

### Push delivery

```
device_tokens             id, user_id, expo_push_token, platform (ANDROID|IOS),
                          last_seen_at, revoked_at
notification_deliveries   id, occurrence_id, user_id, device_token_id, sent_at,
                          expo_ticket_id, expo_receipt_status, error
```

`notification_deliveries` exists because Expo Push is a two-step protocol: the send returns a
*ticket*, and receipts must be polled afterwards to detect `DeviceNotRegistered` and prune
dead tokens. Skipping this is how push silently rots.

The notification carries an **action button ("Done")** via an Expo notification category; the
action handler calls `POST /routine-occurrences/:id/complete` so the task can be ticked off
without opening the app.

### Out-of-range measurements

A value outside `min_threshold` / `max_threshold` is an **in-app visual signal only — never a
push notification.** Push is reserved for routines.

- The measurement renders in an alert colour wherever it appears.
- The tank card carries a warning badge while its latest reading for any parameter is out of
  range.
- The history chart draws the acceptable range as a shaded band.

The API therefore exposes the thresholds alongside the values (they are part of the resolved
parameter set) and does **not** compute an alert state server-side beyond what the client can
derive. No `is_critical` flag, no alert entity, no notification path.

## Open questions

None outstanding. The model above is complete pending final validation.
