# Installation planning for a Windows kiosk

This document describes the prepared installation path, not a claim that a GymGuide kiosk has been installed on a customer PC. Use a disposable Windows 11 Pro test machine to validate the exact release before production use.

## Components on the kiosk

- Windows 11 Pro.
- MongoDB Community Server as a local Windows service, configured for loopback and a persistent `dbPath`.
- GymGuide versioned app payload and pinned Node runtime under `C:\Program Files\GymGuide`.
- MongoDB, media, configuration, logs and backups under `C:\ProgramData\GymGuide` (MongoDB may use a separately configured path).
- WinSW-wrapped GymGuide production runner, and Edge Assigned Access configured by the operator.

The Inno Setup source and PowerShell scripts are in `deployment/windows`. The installer does not install MongoDB, create Windows users, alter firewall/Assigned Access, or automatically register the GymGuide service unless its explicit optional task is selected.

## Recommended first-install sequence

1. Review [Windows deployment](DEPLOYMENT-WINDOWS.md) and the detailed [operator README](../deployment/windows/README.md). Prepare approved offline installers for MongoDB Server and Database Tools separately.
2. Install/configure MongoDB to start automatically, listen on loopback, and use persistent database/log directories. Prefer MongoDB authentication with a dedicated database account. Verify local connection.
3. Build and inspect an offline GymGuide payload with exact Node runtime, API production dependencies, WinSW executable and release version. Audit required offline assets.
4. Compile/run the Inno Setup installer from approved media. Confirm app files are in Program Files and persistent data/config directories are in ProgramData. Create or review the protected `gymguide.env`; use a unique production `SESSION_SECRET` and absolute external media path.
5. Confirm `MONGODB_URI` names a new GymGuide database, not `gymguide_dev` and not another gym/customer database. Explicitly initialize intended demo/catalog content only as planned, then create the first admin with the setup prompt. These are operator actions, not automatic startup tasks.
6. Register/start GymGuide service once MongoDB and the first staff account are ready. Check local health, sign in to `/admin`, and test member routes and media.
7. Configure a restricted Windows kiosk account, automatic sign-in/Assigned Access and Edge local URL manually. Keep a separate maintenance account and test the assigned escape/maintenance procedure.
8. Verify reboot startup, service recovery, database persistence, media, backup/restore and rollback on the target test machine before using real content.

## Application data versus code

Versioned source/build/runtime files are replaceable under Program Files. Production MongoDB URI, session secret, gym settings/content and media must remain outside the release directory. The production config intentionally refuses a media path inside the app release. Do not include a real database dump, media, secrets or `.env` in an installer.

## Installation artifacts

- `deployment/windows/GymGuide.iss`: Inno Setup package definition.
- `deployment/windows/scripts/Build-OfflinePayload.ps1`: assembles a payload from local trusted inputs; it does not download dependencies.
- `deployment/windows/scripts/Install-GymGuideService.ps1`: registers/starts GymGuide service, expects elevation and a running MongoDB service.
- `deployment/windows/mongod.cfg.example`: reference MongoDB config, not automatically applied.
- `deployment/windows/gymguide.env.example`: production environment template, not secrets.

Prepared scripts may have effects on a Windows system; inspect them and use the release guide. No script execution is required to read this document.
