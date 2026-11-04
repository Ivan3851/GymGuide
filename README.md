# GymGuide

GymGuide is an offline-first gym guidance kiosk for a Windows PC. Members can browse muscle groups, gym equipment, exercise guidance and floor-plan locations without signing in. Staff use a separate password-protected administration area to manage content and kiosk settings.

## Getting Started — Installation on a New Windows PC

This guide covers a local development/demo setup and explains what is currently prepared for a dedicated kiosk. The Windows installer, services, Assigned Access setup, update/rollback, backup/restore and power-loss recovery have **not** been verified on a customer kiosk. Do not treat this guide as evidence of a completed deployment; use a disposable Windows 11 Pro PC for deployment rehearsal.

### 1. Check prerequisites

The deployment target is **Windows 11 Pro**. GymGuide has no published minimum hardware specification. For planning, use an SSD, at least 8 GB RAM, a supported x64 CPU, and a touchscreen with a resolution and viewing angle suitable for the kiosk location. These are recommendations, not tested minimums; verify performance with the chosen videos and display.

Install these tools from their official sources:

- [Git for Windows](https://git-scm.com/install/windows) (or optionally [GitHub Desktop](https://desktop.github.com/) if you prefer a graphical Git client).
- [Node.js for Windows](https://nodejs.org/en/download/). npm is included with the Node.js installer. Use a Node version validated with this repository's lockfiles and intended MongoDB adapter/server; the repository does not pin the runtime version.
- [MongoDB Community Server](https://www.mongodb.com/try/download/community). During a local development installation, configure the MongoDB Windows service to start and listen on the local machine.
- [MongoDB Compass](https://www.mongodb.com/products/tools/compass) is **optional**. It provides a graphical way to inspect the local database; GymGuide and its command-line checks do not require it.

Dependency installation and cloning require network access unless you already have the repository and all required packages/installers in an approved offline cache or payload. Once installed, normal GymGuide operation is local and does not require internet access.

Open PowerShell and verify the tools:

```powershell
git --version
node -v
npm -v
Get-Service | Where-Object { $_.Name -match 'mongo' } | Format-Table Name, Status
Test-NetConnection 127.0.0.1 -Port 27017
```

The MongoDB service name can differ by installer/version. If it is installed but stopped, start the actual service name from an elevated PowerShell window, for example `Start-Service -Name 'MongoDB'`. Do not change an existing service or database until you have confirmed it is the intended local development installation.

### 2. Download GymGuide

Use the GitHub repository URL supplied by the project owner or copy it from the repository's GitHub page using **Code → HTTPS**. This handover does not publish or imply a repository URL.

Replace the placeholder below with that real URL:

```powershell
New-Item -ItemType Directory -Path "$env:USERPROFILE\source" -Force | Out-Null
Set-Location $env:USERPROFILE\source
git clone '<repository-url-from-the-project-owner>' GymGuide
Set-Location .\GymGuide
code .
```

If the `code` command is not available, open VS Code and choose **File → Open Folder**, then select the cloned `GymGuide` folder. You can also keep using the current PowerShell window from that folder.

### 3. Install project dependencies

Run these commands from the repository root. The repository has separate root tooling, API and web package manifests/lockfiles:

```powershell
npm install
npm --prefix apps/api install
npm --prefix apps/web install
```

These commands download packages and therefore need internet access or a populated npm cache/registry. They install dependencies only; they do not connect to, reset, seed or modify MongoDB. Do not run package installation from an untrusted project copy.

### 4. Start and verify local MongoDB

GymGuide's development URI is:

```text
mongodb://127.0.0.1:27017/gymguide_dev
```

This selects a local MongoDB server on port 27017 and the development database named `gymguide_dev`. MongoDB creates database collections when writes/initialization require them; Sails startup uses safe migration behavior and ensures application indexes. Startup does not seed or reset content.

Check that MongoDB is listening:

```powershell
Test-NetConnection 127.0.0.1 -Port 27017
```

If `mongosh` is installed, you can also ping MongoDB:

```powershell
mongosh 'mongodb://127.0.0.1:27017/gymguide_dev' --quiet --eval 'db.adminCommand({ ping: 1 })'
```

The development database is separate from production. Production startup rejects `gymguide_dev`, requires a loopback MongoDB URI that names a database, and requires a persistent media directory outside the application release. **Never delete, reset, or repurpose an existing database to follow this guide.** Check `MONGODB_URI` before any database initialization command.

### 5. Configure the development environment

Copy the checked-in development template and edit it locally:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
notepad apps/api/.env
```

The `.env` file is local and must not be committed. Its current variables are:

| Variable                                          | Development purpose                                                                                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                        | Use `development` for local work.                                                                                                                    |
| `HOST` / `PORT`                                   | Sails API bind address and port; defaults are `127.0.0.1` and `1337`.                                                                                |
| `MONGODB_URI`                                     | Local MongoDB connection and database name; default is `gymguide_dev`.                                                                               |
| `GYMGUIDE_GYM_ID`                                 | Selects the gym record used by member/admin operations; demo default is `demo-gym`.                                                                  |
| `SESSION_SECRET`                                  | Optional in development; production must use a unique secret of at least 32 bytes. Never put a production secret in source control or frontend code. |
| `SESSION_COOKIE_SECURE`                           | Set `false` for the local HTTP development setup. Use `true` only when production HTTPS is actually configured.                                      |
| `ADMIN_SESSION_MAX_AGE_MS`                        | Admin session cookie lifetime in milliseconds; default is eight hours.                                                                               |
| `GYMGUIDE_MEDIA_DIR`                              | Optional media root. Development defaults to repository-root `data/media`; production requires an absolute persistent path outside the release.      |
| `MEDIA_MAX_VIDEO_BYTES` / `MEDIA_MAX_IMAGE_BYTES` | Upload size limits; defaults are 512 MiB and 15 MiB.                                                                                                 |

The production template also supports `MONGODB_READINESS_RETRY_MS` (default 2000; allowed range 250–60000 ms) for the production runner's MongoDB TCP retry interval. The admin setup script accepts optional one-time `ADMIN_USERNAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` environment overrides; omit them to enter the username/email interactively and type the password into the hidden prompt. Avoid putting passwords in shell history or shared logs.

### 6. Initialize a development/demo database and admin

For an **empty, disposable development/demo database only**, check `MONGODB_URI` in `apps/api/.env`, then run:

```powershell
npm run seed:demo
npm run setup:admin
```

The seed creates fictional demo gym/catalog/inventory data. It is insert-only and refuses to proceed when it finds non-demo records in protected collections; it does not remove data or overwrite existing demo edits. `setup:admin` prompts for the account name and email, then requests a hidden password. It requires an active gym matching `GYMGUIDE_GYM_ID` and refuses to replace an existing username. A password reset requires the explicit `--reset-existing` option; use it only when deliberately resetting that account.

**Do not run `npm run seed:demo` against a production/customer database.** There is currently no production-safe real-gym initialization/import command in this repository. The admin setup script requires an already active gym, while demo seeding creates demo-marked records. A real customer installation must not proceed until its approved process for creating the initial gym, real catalog and first admin is defined. Do not use demo seeding as a workaround.

### 7. Start GymGuide in development

Open two PowerShell terminals in the repository root. In terminal 1:

```powershell
npm run dev:api
```

In terminal 2:

```powershell
npm run dev:web
```

Open <http://127.0.0.1:5173>. The API is <http://127.0.0.1:1337>; the Vite development server proxies `/api` requests to `http://127.0.0.1:1337`. The admin area is at <http://127.0.0.1:5173/admin>.

To verify API/database readiness and the frontend proxy:

```powershell
Invoke-RestMethod http://127.0.0.1:1337/api/v1/health
Invoke-RestMethod http://127.0.0.1:5173/api/v1/health
```

Stop each development process with **Ctrl+C** in its own terminal. This stops the app processes; it does not delete MongoDB content.

### 8. Optional: test from a tablet on the same LAN

During development only, Vite listens on `0.0.0.0:5173`, so another device on the same local network can reach the frontend. On the PC, run:

```powershell
ipconfig
```

Find the active Wi-Fi/Ethernet adapter's **IPv4 Address**, for example `192.168.0.101`, then open `http://<PC-IP>:5173` on the tablet, replacing `<PC-IP>` with that address. Vite handles `/api` on the host PC and proxies it to the API at `127.0.0.1:1337`; the tablet does not connect directly to the API or MongoDB.

If Windows Firewall prompts, allow the Node/Vite development server on the trusted **Private** network only. Do not expose the API or MongoDB ports to the LAN or change firewall settings to troubleshoot without understanding the network. Some Wi-Fi access points enable client/AP isolation, which prevents wireless devices from contacting each other; check the router/access-point settings if the tablet cannot reach the PC. LAN Vite access is for development/testing and is **not** the production kiosk architecture.

### 9. Build and serve the production frontend locally

From the repository root:

```powershell
npm run build
npm run dev:api
```

The build writes static frontend files to `apps/api/assets`; Sails then serves the built UI and API from <http://127.0.0.1:1337/>. Stop Vite if it is running to avoid confusion. This is useful for checking the built UI against the development API/database; it is **not** a production deployment or the production runner.

The production runner is `apps/api/scripts/start-production.js`. It requires a production environment with a unique `SESSION_SECRET`, a non-development local MongoDB database, and an absolute media directory outside the release. On an already prepared installation, that is launched by the Windows service. The service, kiosk account and Edge startup process described in [Windows deployment](docs/DEPLOYMENT-WINDOWS.md) are prepared procedures, not verified installations.

### 10. Dedicated kiosk installation (prepared, not yet field-verified)

The current repository contains an Inno Setup definition, a payload builder, data-folder initializer, WinSW service template, service install/remove scripts, update and rollback logic, and manual matched backup/restore scripts. It does **not** install MongoDB, create Windows accounts, configure Assigned Access, configure Windows startup/firewall, or provide a production real-gym content bootstrap. MongoDB Server and Database Tools are separate operator-installed components.

The documented deployment path is: validate an exact runtime/dependency bundle and offline assets on a build machine; create/inspect a versioned payload; compile `deployment/windows/GymGuide.iss`; install/configure MongoDB separately; install the GymGuide package; review the protected `C:\ProgramData\GymGuide\config\gymguide.env`; initialize real gym data using an approved process (not present yet); then register the service and configure separate maintenance/member Windows accounts and Edge Assigned Access manually. The data initialization script creates a random `SESSION_SECRET` only when the local environment file is missing and preserves an existing file. Persistent media/configuration belong under ProgramData and app releases under Program Files. See [Installation](docs/INSTALLATION.md), [Windows deployment](docs/DEPLOYMENT-WINDOWS.md), and the detailed [operator guide](deployment/windows/README.md) for exact script parameters and limitations.

The installer, service lifecycle, kiosk account, Assigned Access, backup/restore, versioned update/rollback and power-loss recovery have not been validated on the target kiosk. Do not claim that this PC boots unattended into GymGuide until these procedures have been rehearsed on a disposable Windows 11 Pro machine.

### 11. Verify and shut down safely

- `GET http://127.0.0.1:1337/api/v1/health` reports that the API can ping MongoDB.
- Open the member homepage and browse the available content.
- Open `/admin` and sign in with the account you created.
- Add or change a harmless test/demo record, restart the API, and confirm the record remains; do not use real customer content for this check.
- Test a local video and inspect its playback/seek behavior if demo media has been added.
- Open `/map` and an exercise detail with a mapped machine if floor-plan content exists.
- Stop the API/Vite processes with **Ctrl+C**. Leave MongoDB running if other local applications use it; stop its Windows service only when you know it is safe to do so.

After a dedicated installation has been fully initialized and accepted, an administrator can inspect/restart the GymGuide service without altering its database or media:

```powershell
Get-Service -Name GymGuide
Restart-Service -Name GymGuide
```

Run the service command in an elevated PowerShell window. Do not use `Restore-GymGuide.ps1` as a restart method; restore replaces data.

For failures, see [Troubleshooting](docs/TROUBLESHOOTING.md). Detailed operational and deployment notes are in the [documentation index](docs/README.md).

## Current capabilities

- Member browsing for muscle groups, equipment, exercises, variations and exercise details.
- Exercise and general gym maps using uploaded plan images and normalized equipment marker positions.
- Local MP4/JPEG/PNG/WebP media management from the staff area.
- English and Macedonian interface/content support with fallback behavior.
- Admin sign-in, content CRUD, media, floor-plan editor and gym settings.
- Configurable member idle reset, default 60 seconds; active video playback defers reset. Admin routes have a separate session.
- Persistent production configuration checks and prepared Windows installer/service/backup/update scripts.

## Common project commands

```powershell
npm test
npm run lint
npm run format:check
npm run build
```

`npm run build` builds the frontend into `apps/api/assets`; it does not create or install a Windows kiosk package.

## Important operational notes

- Keep `.env`, passwords, database files, media and real gym content out of Git.
- Production requires a strong unique `SESSION_SECRET`, a local MongoDB URI other than `gymguide_dev`, and an absolute media directory outside the versioned application folder.
- Database and media backups must be treated as a matched set. The Windows scripts are operator-run; restore can replace current data. Read the operator guide before use.
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
