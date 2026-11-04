# Installation on Windows

This guide distinguishes a usable local development/demo setup from the prepared dedicated-kiosk deployment. The production installer, Windows services, Assigned Access, backup/restore, update/rollback and power-loss recovery have not been verified on target hardware. Rehearse deployment on a disposable Windows 11 Pro computer before using real gym content.

For the beginner step-by-step setup, hardware notes, PowerShell verification commands, development startup and same-LAN tablet instructions, see the **Getting Started — Installation on a New Windows PC** section in the [root README](../README.md). This guide covers the installation/deployment details and current limitations.

## Local development installation

1. Install Git for Windows, Node.js/npm, and MongoDB Community Server. MongoDB Compass is optional. The repository does not pin a Node version; verify the chosen Node/MongoDB combination with the exact lockfiles before using it for production.
2. Clone the repository using the URL supplied by the project owner. From the repo root install the manifests separately:

   ```powershell
   npm install
   npm --prefix apps/api install
   npm --prefix apps/web install
   ```

3. Configure the development database and environment. Copy `apps/api/.env.example` to `apps/api/.env`. The default `MONGODB_URI` targets `mongodb://127.0.0.1:27017/gymguide_dev`; confirm it before running any initialization command. Keep `.env` local.
4. For an empty, disposable demo database only, run `npm run seed:demo`, then `npm run setup:admin`. The seed creates fictional demo data, is insert-only, refuses protected non-demo data and does not run at app startup. Do not use it for customer data. The admin setup prompts for username/email and a hidden password, requires an active gym matching `GYMGUIDE_GYM_ID`, and refuses to overwrite an existing user.
5. Start `npm run dev:api` and `npm run dev:web` in separate PowerShell terminals. Open `http://127.0.0.1:5173`; API health is `http://127.0.0.1:1337/api/v1/health`.

Sails runs in safe migration mode, ensures indexes and creates collections as data is initialized/written. It does not reset or seed data on normal startup. For exact commands and environment variable meanings, see [Development](DEVELOPMENT.md) and [Database](DATABASE.md).

## Important production initialization limitation

There is currently no documented production-safe real-gym initialization/import command. The only seed command is for demo data; it creates demo-marked catalog/inventory records and must not be run against a production/customer database. `setup-admin.js` requires an active gym record first. Therefore a clean production install cannot yet be fully initialized through a supported customer-content bootstrap workflow in this repository. Define and review that workflow before taking a kiosk into service. Do not remove this limitation by running demo seed against customer data or by manually editing the live database without an approved process.

## Prepared dedicated kiosk installation

The expected target is a dedicated Windows 11 Pro touchscreen PC with an SSD and adequate resources for the selected display and media. No tested minimum hardware specification is published. MongoDB Community Server and MongoDB Database Tools are installed/configured separately; they are not bundled by GymGuide's Inno Setup package.

The repository currently provides:

- [`Build-OfflinePayload.ps1`](../deployment/windows/scripts/Build-OfflinePayload.ps1): stages a versioned app from local Node runtime, API production dependencies and WinSW inputs. It does not download dependencies.
- [`GymGuide.iss`](../deployment/windows/GymGuide.iss): Inno Setup package definition. It creates Program Files release paths and ProgramData directories; it does not install MongoDB, create Windows accounts, configure firewall/Assigned Access, or automatically register the GymGuide service unless its unchecked optional task is selected.
- [`Initialize-GymGuideData.ps1`](../deployment/windows/scripts/Initialize-GymGuideData.ps1): prepares local data directories and a protected production environment file if one is absent. Existing configuration is preserved.
- [`Install-GymGuideService.ps1`](../deployment/windows/scripts/Install-GymGuideService.ps1) and [`GymGuideService.xml`](../deployment/windows/service/GymGuideService.xml): install the WinSW-wrapped GymGuide runner service, expect the MongoDB service to exist and be running, and use LocalService for GymGuide.
- [`Update-GymGuide.ps1`](../deployment/windows/scripts/Update-GymGuide.ps1), [`Backup-GymGuide.ps1`](../deployment/windows/scripts/Backup-GymGuide.ps1) and [`Restore-GymGuide.ps1`](../deployment/windows/scripts/Restore-GymGuide.ps1): operator-run version switching and paired data/media operations. Restore is destructive and uses `mongorestore --drop`; read the operator documentation before use.

The documented layout keeps versioned application/runtime files under `C:\Program Files\GymGuide` and configuration, media, logs, and operator backups under `C:\ProgramData\GymGuide`. MongoDB's own database path is configured separately, with [`mongod.cfg.example`](../deployment/windows/mongod.cfg.example) as a reference only.

Follow the detailed [Windows deployment guide](DEPLOYMENT-WINDOWS.md) and [operator procedures](../deployment/windows/README.md) for actual parameters. At a high level, the prepared procedure is:

1. On a trusted build PC, run tests/lint/format/build and review/audit the exact locked dependencies. Supply already downloaded Node runtime, API production `node_modules`, and reviewed WinSW executable to `Build-OfflinePayload.ps1`; inspect the result and offline asset audit.
2. Compile the reviewed payload using Inno Setup and transfer the approved installer and separate MongoDB installers/tools on offline media.
3. On the target, install MongoDB separately, configure its loopback listener, persistent path, service startup/recovery, ACLs, and (recommended) database authorization. Verify it locally.
4. Run the GymGuide installer. Review the protected `C:\ProgramData\GymGuide\config\gymguide.env`: production must have a unique `SESSION_SECRET` (at least 32 bytes), a local MongoDB URI that names a non-`gymguide_dev` database, `HOST=127.0.0.1`, `PORT=1337`, the selected gym ID, and an absolute persistent media path outside the release.
5. Do not start the GymGuide service until the production gym/catalog/admin initialization gap described above has an approved resolution. Never run demo seed on customer data.
6. Once application data is initialized through the approved process, register/start the GymGuide service using the explicit installer task or the documented elevated script.
7. Create a standard restricted member Windows account and separate maintenance administrator; configure Edge Assigned Access to `http://127.0.0.1:1337/` manually. GymGuide scripts do not change accounts, kiosk mode, Windows startup settings, or firewall rules.
8. On disposable test data, verify API health, member/admin flows, media, map markers, MongoDB/GymGuide service restart, reboot behavior, backups/restores, and version update/rollback. Do not call deployment complete until target-machine acceptance passes.

Production serves the built SPA and API from Sails at the loopback origin. Vite's `0.0.0.0:5173` listener and its proxy to `127.0.0.1:1337` are development-only; no LAN API, firewall rule, internet or remote service is required in the production architecture.

## Stop and recovery

For local development, press **Ctrl+C** in both API and Vite terminals. This does not stop MongoDB or change database contents. On an installed kiosk, service stop/restart, data restore, and release rollback are operator actions; use the [operator guide](../deployment/windows/README.md), verify the target and backup first, and never reset a live database as a troubleshooting step.
