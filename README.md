# GymGuide

GymGuide is a local touchscreen gym guidance kiosk with a MongoDB-backed exercise catalog, gym-specific equipment locations, local media, staff content management and member inactivity reset.

## Project structure

- `apps/api` — Sails.js API, Waterline models, catalog services, MongoDB indexes, and demo seed process.
- `apps/web` — Vue 3 + Vite interface, Vue Router pages, API client, and reusable interface components.
- `deployment/windows` — reserved for the future Windows kiosk installer and service configuration.
- `docs` — product and operating notes.

The frontend and backend have separate package manifests and lockfiles, so each can be installed and developed independently. Vite proxies `/api` to Sails during development. Production builds go to `apps/api/assets`, which Sails serves with the API.

## Prerequisites

- Node.js 26.13.0 (verified in the development workspace).
- npm 11.20.0 (verified in the development workspace).
- MongoDB Community Server available at `127.0.0.1:27017`.

The verified local MongoDB server is 9.0.4. Phase 2 successfully connected the Sails adapter to this server using Node 26.13.0. The adapter's published compatibility matrix does not list this exact combination, so it should be rechecked when the packaged runtime or adapter versions change.

## Install dependencies

Run from the repository root:

```powershell
npm install
npm --prefix apps/api install
npm --prefix apps/web install
```

Each app has its own `node_modules` and lockfile. The API-local installation is important because Sails discovers installed ORM hooks from `apps/api/node_modules`.

## Configure MongoDB

MongoDB must be running locally. The default connection is:

```text
mongodb://127.0.0.1:27017/gymguide_dev
```

Optional overrides go in `apps/api/.env`. Start by copying the example:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Available values:

- `MONGODB_URI` — local MongoDB connection string.
- `GYMGUIDE_GYM_ID` — gym whose local equipment inventory is browsed; defaults to `demo-gym`.
- `HOST` and `PORT` — API bind address and port; default to `127.0.0.1` and `1337`.
- `SESSION_SECRET` — signs admin session cookies. Required by Sails in production; use a long random value and keep it private. The development fallback is only for local development.
- `SESSION_COOKIE_SECURE` — set to `true` only when serving the application over HTTPS. The local Windows kiosk uses loopback HTTP and should use `false`.
- `ADMIN_SESSION_MAX_AGE_MS` — admin session cookie lifetime in milliseconds; defaults to 8 hours.

`.env` files, credentials, database files, logs, and generated frontend assets are ignored by Git. Do not place secrets in Vite frontend variables.

## Seed the demo catalog

Run:

```powershell
npm run seed:demo
```

The seed upserts records using stable demo IDs. Running it again updates the same records and does not create duplicates. It does not drop collections or delete unrelated data. Demo source records are kept in `apps/api/api/data/demo-catalog.js` so the sample content is easy to replace.

The seed contains 9 muscle groups, 8 reusable equipment types, 12 exercises, 4 exercise variations, exercise-to-muscle and exercise-to-equipment relationships, one demo gym, and 8 gym-specific equipment units. Exercise media references are empty; the interface shows an explicit video placeholder.

### Reset guidance

For ordinary refreshes, use `npm run seed:demo`; no reset is needed. If you deliberately want a clean demo database, first confirm that `MONGODB_URI` points to the dedicated `gymguide_dev` database, stop the API, and make a backup. Then use MongoDB Compass to remove only the verified `gymguide_dev` database and rerun the seed. Never run a reset against a database containing gym or production data.

## Start the backend and frontend

Seed once, then use two terminals from the repository root.

Terminal 1:

```powershell
npm run dev:api
```

Terminal 2:

```powershell
npm run dev:web
```

Open `http://127.0.0.1:5173`. The API listens at `http://127.0.0.1:1337`. In development, Vite forwards `/api` requests to Sails.

## Member journey

1. Choose a muscle group on the home page.
2. Choose available equipment at the demo gym.
3. Choose a compatible exercise.
4. Read the demo exercise steps, targeted muscles, benefits, tips, common mistakes, and variations.

All browsing information is loaded from the API. Demo exercise and equipment descriptions are fictional sample content and should be replaced with gym-approved guidance before real use.

## Admin account setup

Seed the demo gym, then run this command from the repository root:

```powershell
npm run setup:admin
```

The setup process asks for a username, optional email and password. Password entry is hidden. A password must be 12–128 characters. It creates or resets the named admin account for the active gym. No default account or password exists. Keep the password and `SESSION_SECRET` private; `.env` is ignored by Git. The setup process only updates that admin account and does not reset catalog or gym data.

Passwords are limited to 72 UTF-8 bytes because bcrypt only processes up to 72 bytes. The installer/update phase should provision a unique `SESSION_SECRET` before starting Sails with `NODE_ENV=production`.

Admin sessions use signed HTTP-only `gymguide.sid` cookies with `SameSite=Strict`; JavaScript cannot read the session cookie. Admin state-changing requests require a per-session CSRF token in `X-CSRF-Token`. Login attempts are limited to 8 per source IP in a 15-minute window. The current session and rate-limit stores are in memory, so a Sails restart signs staff out and resets the rate-limit window. The session cookie survives frontend refreshes while the API process remains up.

Sails automatic REST, shortcut and action blueprints are disabled. Only the explicitly configured `/api/v1` routes are exposed, including the admin routes with their authentication and CSRF policies.

Open the staff area directly at `http://127.0.0.1:5173/admin`. It includes a dashboard and CRUD forms for muscle groups, equipment types, demo-gym inventory, exercises and variations. Member browsing remains public at `/`.

## API routes

Public member routes remain unauthenticated. Admin routes require an authenticated admin session, and all state changes require CSRF validation. All routes use `/api/v1`:

| Method and path                                             | Purpose                                                                           |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `GET /api/v1/health`                                        | Checks API and MongoDB connectivity.                                              |
| `GET /api/v1/kiosk/settings`                                | Returns the configured member inactivity timeout.                                 |
| `GET /api/v1/muscle-groups`                                 | Lists active muscle groups.                                                       |
| `GET /api/v1/muscle-groups/:id/equipment`                   | Lists compatible equipment types and available gym units.                         |
| `GET /api/v1/equipment/:id/exercises`                       | Lists exercises for an equipment type and their target muscles.                   |
| `GET /api/v1/exercises/:id`                                 | Returns exercise guidance, media and matching gym equipment/floor plan locations. |
| `GET /api/v1/exercises/:id/variations`                      | Lists variations for an exercise.                                                 |
| `GET /api/v1/media/:id/content`                             | Streams referenced media; supports single byte ranges for video seeking.          |
| `GET /api/v1/floor-plans`                                   | Lists active floor plans for the configured gym.                                  |
| `GET /api/v1/floor-plans/:id`                               | Returns a floor plan and its active equipment markers.                            |
| `GET /api/v1/auth/csrf`                                     | Creates/returns a CSRF token for login or subsequent admin mutations.             |
| `POST /api/v1/auth/login`                                   | Signs in with username/email and password.                                        |
| `POST /api/v1/auth/logout`                                  | Invalidates the admin session.                                                    |
| `GET /api/v1/auth/session`                                  | Returns the authenticated admin or 401.                                           |
| `GET /api/v1/admin/dashboard`                               | Returns active content counts for the signed-in gym.                              |
| `GET /api/v1/admin/settings` / `PUT /api/v1/admin/settings` | Reads or updates gym kiosk settings (admin and CSRF required for updates).        |
| `GET /api/v1/admin/:resource`                               | Lists managed content; `includeArchived=true` includes archived entries.          |
| `POST /api/v1/admin/:resource`                              | Creates a muscle group, equipment type, gym unit, exercise or variation.          |
| `PUT /api/v1/admin/:resource/:id`                           | Updates a managed record and exercise relationships.                              |
| `PATCH /api/v1/admin/:resource/:id/archive`                 | Archives without deleting or breaking references.                                 |
| `PATCH /api/v1/admin/:resource/:id/restore`                 | Restores an archived record.                                                      |
| `GET /api/v1/admin/media` / `POST /api/v1/admin/media`      | Lists or uploads local media (admin session required).                            |
| `DELETE /api/v1/admin/media/:id`                            | Deletes an unused media asset; referenced assets return 409.                      |
| `/api/v1/admin/floor-plans/:id/markers`                     | Lists, places, moves or deletes equipment markers with CSRF-protected mutations.  |

Successful responses use a `{ "data": ... }` envelope. Errors use `{ "error": { "code": ..., "message": ... } }`; invalid IDs return 400, missing records return 404, and database unavailability returns 503.

## Database collections

- `gyms` — gym identity; demo gym ID is `demo-gym`.
- `gyms.settings.memberInactivityTimeoutSeconds` — per-gym member idle timeout; defaults to 60 seconds and accepts 15–600 seconds.
- `muscleGroups` — shared catalog of muscle groups.
- `equipmentTypes` — shared catalog of machine and equipment types.
- `exercises` — shared instructions, benefits, tips, mistakes, and media reference fields.
- `exerciseVariations` — variations referencing a parent exercise.
- `exerciseMuscles` — exercise-to-muscle references with primary or secondary role.
- `exerciseEquipment` — exercise-to-equipment-type references.
- `gymEquipment` — gym-owned installed units, linking a `gymId` to an `equipmentTypeId`.
- `mediaAssets` — uploaded media metadata, generated storage name, size, checksum and status. Binary files live on disk, not in MongoDB.
- `gymFloorPlans` — gym-owned floor labels and references to floor plan image assets; archiving hides a plan from members.
- `floorPlanMarkers` — gym equipment placement per plan using normalized `x` and `y` coordinates from 0 to 1.
- `adminUsers` — gym staff credentials (bcrypt password hashes only), roles and gym assignment. Password hashes are never returned by the API.

References are stored as stable string IDs. Sails model definitions validate field types and required values; the seed validates relationships before writing. Database indexes cover unique slugs, association pairs, ordering, and gym inventory lookups. Indexes are ensured during API startup and demo seeding.

## Verify the API

Health and a sample catalog request:

```powershell
Invoke-RestMethod http://127.0.0.1:1337/api/v1/health
Invoke-RestMethod http://127.0.0.1:1337/api/v1/muscle-groups
```

The frontend home page shows the local API status. The Vite API proxy can also be checked directly:

```powershell
Invoke-RestMethod http://127.0.0.1:5173/api/v1/health
```

## Build and quality checks

```powershell
npm run lint
npm run format:check
npm test
npm run build
```

The production frontend build is generated in `apps/api/assets` and served by Sails from the same local origin as the API.

## Local media and floor plans

In development, uploaded files default to `<repository-root>/data/media`, which is ignored by Git. Set `GYMGUIDE_MEDIA_DIR` in `apps/api/.env` to choose another directory. A Windows installation can set it to a protected directory such as `C:\ProgramData\GymGuide\media`. The API creates separate `.incoming` and `files` subdirectories and stores only generated UUID names. MongoDB stores the original filename and media metadata. The default limits are 512 MiB per video and 15 MiB per image; `MEDIA_MAX_VIDEO_BYTES` and `MEDIA_MAX_IMAGE_BYTES` can override them.

Only MP4, JPEG, PNG and WebP are accepted. The API checks the extension, MIME type, leading file signature and type-specific size limit. An admin previews assets in `/admin/media`, then can select them on exercise or floor-plan forms. Videos use native browser controls and byte-range streaming; a media asset is served publicly only while linked to active published content. Unattached assets require a valid admin session. Referenced files cannot be deleted.

Create or edit floor plans under **Admin → Floor plans** after uploading a plan image. Use **Positions** to place or drag equipment. Marker coordinates are ratios relative to the displayed image, so locations scale with its rendered size. Members see the relevant floor plan directly on each exercise page. The API matches exercise equipment-type relationships to the gym's active physical units, then highlights only those units that have floor markers. If no matching location is mapped, the page shows available plans without unrelated highlights and explains that no specific location is configured. Archived plans, equipment units and equipment types are omitted from member locations.

Member browsing returns to `/` after the configured idle period (60 seconds by default). Pointer/touch, keyboard and scroll gestures reset the timer; application-generated events do not. Actively playing video defers a timeout until playback ends, while pause or playback errors release a pending reset. Admin routes are excluded from this timer. Staff can change the setting under **Admin → Gym settings**; allowed values are whole seconds from 15 to 600.

Back up MongoDB together with the complete media directory to preserve their references. The media directory can be configured independently of the source tree for Windows deployment.
