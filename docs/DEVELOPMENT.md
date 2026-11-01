# Development

## Prerequisites

- Git, Node.js/npm and MongoDB Community Server on the development PC.
- Local MongoDB reachable at `127.0.0.1:27017`.
- A Node version validated with the exact project lockfiles and MongoDB adapter. At this documentation review, `node -v` returned `v26.13.0` and `npm -v` returned `11.20.0`. The repository does not pin a Node runtime with a version manager file.

The compatibility note in the root README reflects a successful local connection smoke test, not a complete vendor support guarantee. For production, pin the tested runtime in the release record.

Lockfile versions observed during this documentation review:

| Component                           | Locked version |
| ----------------------------------- | -------------: |
| Sails.js                            |         1.5.18 |
| `sails-mongo`                       |          2.1.2 |
| MongoDB Node.js driver (transitive) |          6.3.0 |
| Vue                                 |         3.5.44 |
| Vue Router                          |          4.6.4 |
| Vite                                |          7.3.7 |

These are lockfile versions, not a promise that arbitrary newer runtimes/servers are supported. The previously recorded local smoke test used MongoDB Server 9.0.4 with Node 26.13.0 and connected successfully, but that exact combination is not explicitly vendor-certified in all compatibility tables. Recheck compatibility and run acceptance tests for the pinned deployment bundle.

## Install

From the repository root in PowerShell:

```powershell
npm install
npm --prefix apps/api install
npm --prefix apps/web install
```

Root tooling, API, and web app have separate package manifests/lockfiles. Install API dependencies in `apps/api` because Sails discovers its ORM hook there.

Copy the local config template:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` as needed. Defaults target `mongodb://127.0.0.1:27017/gymguide_dev`, host `127.0.0.1`, and API port `1337`. Keep `.env` private and do not use production credentials in development.

## Seed and account setup

Only run demo seeding against a database you intend to populate. It is explicit, insert-only and refuses when non-demo catalog/inventory records are detected; it is not part of startup.

```powershell
npm run seed:demo
npm run setup:admin
```

Admin setup prompts for a password. Existing usernames are refused unless `--reset-existing` is explicitly supplied to reset that account's password. See [Database](DATABASE.md) for safe demo data handling.

## Run the applications

Terminal 1:

```powershell
npm run dev:api
```

Terminal 2:

```powershell
npm run dev:web
```

Open `http://127.0.0.1:5173`. The Vite config binds to loopback, uses a strict port, and proxies `/api` to `http://127.0.0.1:1337`. The backend serves health at `/api/v1/health`.

## Tests, lint, format and build

From repository root:

```powershell
npm test
npm run lint
npm run format:check
npm run build
```

`npm test` runs the API Node test suite then the frontend Node test suite. The web build writes to `apps/api/assets`; production Sails serves that directory. Formatting uses Prettier repository-wide, so `format:check` can report pre-existing source files outside a documentation change; do not apply `format` blindly across unrelated work.

## Useful checks

```powershell
Invoke-RestMethod http://127.0.0.1:1337/api/v1/health
Invoke-RestMethod http://127.0.0.1:1337/api/v1/muscle-groups
Invoke-RestMethod http://127.0.0.1:5173/api/v1/health
```

The first health URL verifies Sails can ping MongoDB. The Vite URL additionally checks the development proxy. See [Troubleshooting](TROUBLESHOOTING.md) if either fails.

## Source layout

Read [Architecture](ARCHITECTURE.md) for module responsibilities and [API](API.md) before adding routes. Keep validation and domain logic in backend services, use explicit API routes, and keep member-facing content data-driven through MongoDB.
