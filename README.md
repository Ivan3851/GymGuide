# GymGuide

GymGuide is an offline-first gym guidance kiosk for a Windows PC. Members can browse muscle groups, gym equipment, exercise guidance and floor-plan locations without signing in. Staff use a separate password-protected administration area to manage content and kiosk settings.

The current application is a single-gym local installation: Vue 3/Vite frontend, Sails.js API, and MongoDB all run on the kiosk PC. Media files are stored on its local disk. The data model already separates shared catalog records from gym-specific inventory and locations. There is no cloud dependency or synchronization service.

## Current capabilities

- Member browsing for muscle groups, equipment, exercises, variations and exercise details.
- Exercise and general gym maps using the uploaded plan image and normalized equipment marker positions.
- Local MP4/JPEG/PNG/WebP media management from the staff area.
- English and Macedonian interface/content support with fallback behavior.
- Admin sign-in, content CRUD, media, floor-plan editor and gym settings.
- Configurable member idle reset, default 60 seconds; active video playback defers reset. Admin routes have a separate session.
- Persistent production configuration checks and prepared Windows installer/service/backup/update scripts.

See [the documentation index](docs/README.md) for detailed guides and the status of prepared versus field-tested operations.

## Quick start for developers

### Prerequisites

- Windows, Git, Node.js and npm. At this documentation review the workspace reports Node.js `v26.13.0` and npm `11.20.0`; verify your current versions with `node -v` and `npm -v` before development. Compatibility with the production runtime must be validated against the exact package locks and MongoDB server.
- MongoDB Community Server running locally at `127.0.0.1:27017`.

### Install and configure

Run from the repository root in PowerShell:

```powershell
npm install
npm --prefix apps/api install
npm --prefix apps/web install
Copy-Item apps/api/.env.example apps/api/.env
```

The development default database is `gymguide_dev`. Check `MONGODB_URI` in `apps/api/.env` before running any data command. Do not point demo setup at data you need to preserve.

### Seed and create an admin

The demo seed is explicit, insert-only and refuses to run if non-demo catalog/inventory data is found. It does not run during backend startup.

```powershell
npm run seed:demo
npm run setup:admin
```

Admin provisioning refuses to replace an existing user. `--reset-existing` is an explicit password reset option; use it only when intentionally resetting the named local account.

### Run

Use two PowerShell terminals from the repository root:

```powershell
npm run dev:api
```

```powershell
npm run dev:web
```

Open <http://127.0.0.1:5173>. The API is at <http://127.0.0.1:1337>; Vite proxies `/api` to it. Staff can open `/admin`.

Verify health and browse data:

```powershell
Invoke-RestMethod http://127.0.0.1:1337/api/v1/health
Invoke-RestMethod http://127.0.0.1:5173/api/v1/muscle-groups
```

## Common project commands

```powershell
npm test
npm run lint
npm run format:check
npm run build
```

`npm run build` builds the frontend into `apps/api/assets`, the production static directory served by Sails. It does not create or install a Windows kiosk package.

## Important operational notes

- Keep `.env`, passwords, database files, media and real gym content out of Git. Use the supplied environment examples as templates.
- Production requires a strong unique `SESSION_SECRET`, a local MongoDB URI other than `gymguide_dev`, and an absolute media directory outside the versioned application folder.
- Database and media must be backed up as a matched set. The Windows scripts are operator-run and can be destructive during restore; read [Windows deployment](deployment/windows/README.md) first.
- The installer, Windows services, Assigned Access kiosk, backup/restore and update flow are prepared artifacts, not evidence of a customer installation or power-loss test. Rehearse them on a disposable Windows 11 Pro machine before rollout.
- The demo exercise copy is fictional and must be reviewed by qualified gym staff before member use.

## Documentation

- [Documentation index](docs/README.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Development](docs/DEVELOPMENT.md)
- [Installation](docs/INSTALLATION.md)
- [Windows deployment](docs/DEPLOYMENT-WINDOWS.md)
- [Database](docs/DATABASE.md)
- [API](docs/API.md)
- [Admin guide](docs/ADMIN-GUIDE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Security](docs/SECURITY.md)
- [Releasing](docs/RELEASING.md)
- [Detailed Windows operations guide](deployment/windows/README.md)

## License

No license file is currently present in this repository. All rights are reserved unless the project owner specifies otherwise.
