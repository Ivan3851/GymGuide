# Development

## Prerequisites

- Git, Node.js/npm and MongoDB Community Server on the development PC.
- Local MongoDB reachable at `127.0.0.1:27017`.
- A Node version validated with the exact project lockfiles and MongoDB adapter. At this documentation review, `node -v` returned `v26.13.0` and `npm -v` returned `11.20.0`. The repository does not pin a Node runtime with a version manager file.

Previously recorded local connection smoke tests are not a complete vendor support guarantee. For production, pin and acceptance-test the runtime in the release record.

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

Only run demo seeding against a new, disposable development/demo database you intend to populate. It creates fictional demo-marked records, is explicit and insert-only, refuses when protected non-demo catalog/inventory records are detected, and is not part of startup. Never run it against production/customer content. There is currently no production-safe real-gym initialization/import command; admin provisioning requires an active gym record. See [Installation](INSTALLATION.md) for this deployment limitation.

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

Open `http://127.0.0.1:5173`. Vite binds to `0.0.0.0:5173` (all host network interfaces) with a strict port, while its `/api` proxy targets `http://127.0.0.1:1337`. The Sails API remains bound to loopback by default; do not expose port 1337 or MongoDB to the LAN for tablet development access.

To open the development frontend from a tablet on the same trusted LAN, run `ipconfig` on the PC, find its active adapter's IPv4 address, then navigate to `http://<PC-IP>:5173` on the tablet. Replace `<PC-IP>` with the address shown by `ipconfig`. If Windows Firewall prompts, allow the development server only on the trusted Private network. A Wi-Fi router's client/AP isolation can block device-to-device access. Do not disable isolation or change firewall rules without authorization. This is only a development/testing feature; production uses the loopback Sails origin and does not need a LAN listener or firewall exception.

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
