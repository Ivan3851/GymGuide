# Windows deployment model

The target is one Windows 11 Pro touchscreen PC operating fully offline. The browser, frontend, API, database and local media are all on this PC. The installer and scripts in `deployment/windows` are preparation artifacts; actual kiosk setup and power-loss recovery remain target-machine acceptance tests.

## Production layout

```text
C:\Program Files\GymGuide\
  current -> releases\<version>
  releases\<version>\app\       Sails code, production dependencies, built frontend
  releases\<version>\runtime\   pinned Node runtime
  tools\                         operator scripts and service wrapper
C:\ProgramData\GymGuide\
  config\gymguide.env             protected local settings and secret
  media\                          persistent uploads and floor plan images
  logs\                           service and operation logs
  backups\                        matched database/media sets
  data\mongodb\                   example MongoDB dbPath (configure Mongo separately)
```

The MongoDB service owns its database directory. The GymGuide runner reads `MONGODB_URI`, checks that the production database is not `gymguide_dev`, checks that paths are persistent, and only accepts loopback bind/URI settings. The service uses a bundled Node runtime and starts Sails from the active release.

## Startup sequence and recovery

1. Windows starts the MongoDB service (must be separately configured for automatic start).
2. The GymGuide service wrapper starts the Node production runner.
3. Runner opens a local loading page on the configured GymGuide address while polling MongoDB TCP readiness; it then starts Sails. `/api/v1/health` pings the actual Mongo client.
4. Sails ensures indexes and media cleanup, serves the built frontend and API at one origin, and does not seed data.
5. Edge Assigned Access opens the local GymGuide URL under the restricted kiosk user.

If Sails exits, the runner retries after five seconds; WinSW also has configured restart behavior. If Edge loses its connection it should be reopened/reloaded by kiosk operation; the API startup page refreshes while Mongo is unavailable. MongoDB service recovery is configured separately. These implementation paths have not proven actual crash/power-loss behavior; test on the target Windows PC and consider a UPS where power cuts are likely.

## Windows accounts and kiosk mode

Keep Windows maintenance administration separate from the restricted member kiosk account. Staff should use a keyboard and the configured Assigned Access exit/breakout procedure to reach the maintenance account, then open the local admin page or desktop. Configure automatic sign-in, Edge kiosk/full-screen URL and escape procedure manually. GymGuide scripts do not change Windows users, Assigned Access, startup settings or firewall rules. Browser kiosk mode is a usability restriction, not API authorization.

## Local network and internet

Production defaults bind Sails to loopback and MongoDB URI is required to reference loopback. No LAN listener or firewall exception is required. All member data and media are local. No cloud service, CDN, remote fonts or internet access is required at runtime. Updates/installers and external backups may be carried on approved offline media.

## Service setup and logs

The service config is `deployment/windows/service/GymGuideService.xml`; scripts install/remove the GymGuide service. The service install script requires elevated PowerShell, checks MongoDB is running, and grants scoped data permissions. It does not install or modify MongoDB. Check service/application logs under ProgramData and Windows Event Viewer if startup fails. Do not run installation/removal scripts on the development PC unless deliberately performing a test installation.

## Backup, restore and update

See [Releasing](RELEASING.md) and [`deployment/windows/README.md`](../deployment/windows/README.md) for exact commands. Backups pair a Mongo archive with the complete media directory, stop GymGuide while capturing, validate file totals and manifest, and may prune older backups to the configured retention count. Restore is destructive: it uses `mongorestore --drop` and replaces media after a pre-restore backup/confirmation. Updates install a versioned release, switch a junction after a paired backup, health-check, and revert the junction if readiness fails.

The backup scripts are operator-run; there is no automatic scheduled backup. Keep an external verified copy. Uninstall preserves ProgramData.

## Release gates and limitations

- The recorded local smoke test used Node 26.13.0 and MongoDB Server 9.0.4, but the exact Node/MongoDB driver/server combination is not an explicit vendor-tested compatibility guarantee. Validate the exact packaged set.
- The Windows guide records production API dependency audit findings as of 2026-11-01; triage before shipping, and rerun against locked production dependencies.
- Sails default in-memory session-store warning remains relevant; sessions and login rate limit are process-local.
- Installer, service lifecycle, kiosk account, Assigned Access, backup/restore, update/rollback and power-loss behavior have not been run on the target customer kiosk. Follow [Installation](INSTALLATION.md) using a disposable Windows 11 Pro test machine.
