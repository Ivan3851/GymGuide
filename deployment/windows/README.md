# GymGuide on Windows 11 Pro

This folder prepares a local, offline-first production installation. The scripts and Inno Setup source are templates for a future kiosk; they have not been run to install services, alter Windows settings, create accounts, or change the development PC.

## 1. Development PC setup

Use the development commands in the repository [README](../../README.md). The production payload is not the Vite development server: it contains a Vite build under Sails `assets`, and Sails serves both the frontend and `/api/v1` from one origin. The Vite proxy is development-only.

For a payload, first run a normal dependency install/build on a trusted build machine. Supply an exact tested Node runtime, a production-only API `node_modules`, and a reviewed WinSW v3 executable to `scripts/Build-OfflinePayload.ps1`. The script does not download software. Keep a copy of the runtime version, MongoDB Server version, MongoDB Database Tools version, WinSW release and GymGuide release in the release record. Do not upgrade a dependency to address an audit finding as part of a kiosk update without a separate compatibility review.

Example from the repository root (all paths are local build inputs):

```powershell
.\deployment\windows\scripts\Build-OfflinePayload.ps1 `
  -Version '0.1.0' `
  -NodeRuntimeDirectory 'D:\build-inputs\node-runtime' `
  -ApiProductionNodeModules 'D:\build-inputs\api-node_modules' `
  -WinSwExecutable 'D:\build-inputs\WinSW-x64.exe' `
  -OutputDirectory 'D:\gymguide-releases\0.1.0'
```

Inspect the payload and offline-asset audit result before compiling `GymGuide.iss` with Inno Setup's `ISCC.exe`. Example:

```powershell
& 'C:\Program Files (x86)\Inno Setup 6\ISCC.exe' `
  '/DPayloadDir=D:\gymguide-releases\0.1.0' `
  '/DAppVersion=0.1.0' `
  '.\deployment\windows\GymGuide.iss'
```

Provide and review the MongoDB Community Server installer and MongoDB Database Tools separately. They are not bundled or installed by this GymGuide installer. Keep all required installers, license notices and the GymGuide setup executable on approved offline media. Do not ship a database dump, `.env` file, local media or real credentials inside the installer.

### Compatibility and security release gate

On the development PC, the observed versions are Node.js 26.13.0, MongoDB Server 9.0.4, Sails 1.5.18, sails-mongo 2.1.2 and the resolved MongoDB Node.js driver 6.3.0. A direct driver ping to MongoDB 9.0.4 succeeded in this environment. This is a useful smoke test, not a vendor compatibility guarantee: MongoDB's driver compatibility tables mark combinations as untested when blank, and the driver 6.3 / Node 26 / MongoDB 9 combination is not explicitly covered. Node 26 is currently an Active LTS line; the packaged runtime still needs a full acceptance run with the exact adapter, driver and server binaries intended for each kiosk. See [Node release status](https://nodejs.org/en/about/previous-releases) and [MongoDB driver compatibility tables](https://www.mongodb.com/docs/drivers/compatibility/).

The production-only npm audit on 2026-11-01 reported 14 API dependency advisories (1 low, 10 moderate, 3 high) and zero web production dependency advisories. The API advisories include Sails dependency chains such as body-parser, compression, minimatch and qs. npm's suggested `--force` path would make major framework changes; no dependency was automatically changed. **Do not ship a kiosk payload until the API dependency findings have been triaged and addressed in a separate reviewed maintenance change**, then repeat tests and audit against the exact lockfiles.

Sails also logs the Express warning that its default in-memory session store is not intended for production. For this single kiosk it means staff sessions are lost on API restart and session storage is process-local; before unattended customer deployment, select and test a bounded persistent session store or document an accepted single-process limitation. The in-memory login rate limit also resets on service restart.

## 2. First-time kiosk installation

### Target layout

```text
C:\Program Files\GymGuide\
  GymGuideService.exe              WinSW service wrapper
  GymGuideService.xml              service definition
  current -> releases\<version>   active version junction
  releases\<version>\app\         Sails source, dependencies, built assets
  releases\<version>\runtime\     pinned Node runtime
  tools\                           maintenance scripts

C:\ProgramData\GymGuide\
  config\gymguide.env              local secret and settings
  media\                           uploaded videos, images, floor plans
  logs\                            service and operation logs
  backups\                         paired database and media backup sets
```

MongoDB keeps its database files in its own configured `dbPath`, outside the GymGuide application release tree. `mongod.cfg.example` shows a local-only configuration using `C:\ProgramData\GymGuide\data\mongodb` and a persistent log path. It is a reference file and is not installed or applied automatically. Configure the MongoDB Windows service to use the reviewed config before GymGuide is put into service. The data initialization script reads the `MongoDB` service identity and grants it modify access to its data and log directories; pass `-MongoServiceName` for a differently named service or `-MongoServiceAccount` to explicitly choose the account. These standard paths can be changed, but update MongoDB's config, the service XML log path and pass matching `-InstallRoot`/`-DataRoot` values to GymGuide scripts if the default ProgramData location changes.

### Install sequence (requires an administrator)

1. Install MongoDB Community Server from the approved offline installer and configure its Windows service for automatic startup using the reviewed `mongod.cfg.example` as a starting point. This must be done by the kiosk installer/operator; GymGuide does not install or edit the MongoDB service. Verify the Mongo service name, local bind address, persistent database path, service account ACL, restart behavior and a successful local connection. Install MongoDB Database Tools separately for operator-initiated backup and restore.
2. Prefer MongoDB authorization with a dedicated GymGuide database account limited to the GymGuide database. Keep the connection URI in the protected ProgramData config, not in source, command transcripts or installer files. If MongoDB is run without authorization, Windows-local processes can access it; loopback binding limits network exposure but does not provide per-user database isolation.
3. Run the GymGuide Inno Setup installer. It writes the versioned app, Node runtime and service templates under Program Files and creates the ProgramData directories. It creates `gymguide.env` only if one is absent, and generates a unique secret on first creation. Review `MONGODB_URI`, `GYMGUIDE_GYM_ID`, `HOST`, `PORT` and `GYMGUIDE_MEDIA_DIR`. Leave the optional service-registration task unchecked until the database and first staff account are ready.
4. **Do not run demo seeding on a customer/production database.** The repository does not currently provide a production-safe real-gym initialization/import command. `setup-admin.js` requires an already active gym, and the demo seed creates demo-marked data. Define an approved real-gym catalog/gym bootstrap process before production service startup; do not substitute demo content. For a disposable demo installation only, after verifying the configured URI points to a newly named demo database, the following commands explicitly seed demo data and then create a demo admin. Admin setup refuses to replace an existing username. Substitute the exact installed version:

   ```powershell
   $release = "$env:ProgramFiles\GymGuide\releases\0.1.0"
   $env:DOTENV_CONFIG_PATH = "$env:ProgramData\GymGuide\config\gymguide.env"
   & "$release\runtime\node.exe" -r dotenv/config "$release\app\scripts\seed-demo.js"
   & "$release\runtime\node.exe" -r dotenv/config "$release\app\scripts\setup-admin.js"
   ```

   Startup never seeds or resets data. Neither command runs automatically from the Windows service. Never run the seed commands on production/customer data.

5. Register the service by selecting the explicit installer task or running the elevated script with the release version:

   ```powershell
   & "$env:ProgramFiles\GymGuide\tools\Install-GymGuideService.ps1" -ReleaseVersion '0.1.0'
   ```

   It checks that the separate MongoDB service is already running, applies scoped LocalService permissions to GymGuide config/media/log paths and starts GymGuide. It does not modify MongoDB. Inspect `C:\ProgramData\GymGuide\logs\service` and test `http://127.0.0.1:1337/api/v1/health`.

6. Open GymGuide as the intended member account once. Staff use `/admin` and must authenticate; backend session and CSRF protections remain active. Do not expose an admin shortcut in the member kiosk profile.
7. Set up the restricted member account, maintenance administrator and Edge Assigned Access manually as below. These operating system changes are not automatic.

`Install-GymGuideService.ps1` requires an elevated PowerShell. `Remove-GymGuideService.ps1` also requires elevation and only stops/unregisters the GymGuide service. It does not uninstall MongoDB or delete ProgramData. Use the MongoDB installer/vendor instructions for database installation and removal.

### Edge single-app kiosk and Windows accounts

Create a dedicated standard local member account and a separate administrator/maintenance account. Do not give the member account administrator membership or access to the maintenance credentials. Use Windows Settings **Accounts → Other users → Set up a kiosk** (Assigned Access), choose Microsoft Edge as the kiosk app, select the full-screen digital signage experience and set the start URL to `http://127.0.0.1:1337/`. Assigned Access launches Edge on kiosk-account sign-in and Windows relaunches the kiosk app if it exits. Leave Edge's own idle timer disabled: GymGuide owns the member idle timeout. Confirm the current exact screens against Microsoft's [Windows kiosk documentation](https://learn.microsoft.com/windows/configuration/kiosk).

The WinSW template uses its documented LocalService account support and restart actions; inspect the [WinSW service configuration reference](https://github.com/winsw/winsw/blob/v3/docs/xml-config-file.md) before selecting/updating the wrapper release.

Assigned Access configuration and account creation require an administrator and are manual. Do not allow general desktop apps, browser address-bar navigation or Settings for the member profile. Keep a documented maintenance procedure for switching to the separate admin account, updating content and returning to kiosk sign-in. The kiosk browser is a usability boundary; it does not replace backend authorization. Admin API routes remain protected even on localhost.

## 3. Normal daily operation

- Windows starts MongoDB and GymGuide as services. The Edge Assigned Access account signs in and opens the kiosk URL.
- The service binds only to `127.0.0.1` by default. Keep `HOST=127.0.0.1`; the production launcher rejects non-loopback hosts. No firewall rule or LAN listener is required.
- During database startup, GymGuide serves a local loading page that refreshes itself. The launcher waits for MongoDB's local TCP port, then starts Sails; Sails' `/api/v1/health` additionally pings the actual MongoDB connection. It never seeds data at startup.
- Member content, floor plans and video files are served from the local disk. Video uses the API's byte-range response for seeking. No CDN, remote font, remote video, cloud API or internet connection is part of the production runtime.
- The member 60-second default inactivity timer stays active. Touch/navigation counts as interaction; active video playback defers the reset until playback ends unless the member interacts. The admin session uses its own server-side timeout and is not governed by the member timer.
- Keep free disk space available for media and paired backups. Do not delete a backup until a newer verified set exists and is stored off the kiosk.

## 4. Backup, restore and recovery

### Create a matched backup

Run an elevated PowerShell with the actual installed Database Tools path, for example:

```powershell
& 'C:\Program Files\GymGuide\tools\Backup-GymGuide.ps1' `
  -MongoDumpExe 'C:\Program Files\MongoDB\Tools\bin\mongodump.exe' `
  -RetainCount 10 `
  -DestinationRoot 'E:\GymGuideBackups'
```

The script stops the GymGuide service while taking the dump and copying `media`, so metadata/uploads are quiescent together; then it restarts the service. It creates one timestamped folder containing `database.archive.gz`, `media\`, and a manifest with file count/byte totals. It validates the archive is non-empty, validates the copied media against the source, and validates the manifest before promoting the set. Only after that does it prune older GymGuide backup folders beyond `RetainCount`. A failure is logged and the incomplete staging directory is removed; existing completed backups remain. Keep an external USB/off-site copy as well. A backup set is a matched pair; never restore only its database or only its media.

### Restore a selected set

Restore is destructive to the current GymGuide database and media, requires an administrator, and asks for confirmation. First copy the entire set from USB to a local disk and check its manifest. Then:

```powershell
& 'C:\Program Files\GymGuide\tools\Restore-GymGuide.ps1' `
  -BackupPath 'E:\GymGuideBackups\GymGuide-20261101-120000Z' `
  -MongoRestoreExe 'C:\Program Files\MongoDB\Tools\bin\mongorestore.exe' `
  -MongoDumpExe 'C:\Program Files\MongoDB\Tools\bin\mongodump.exe'
```

The restore script validates the matched set, creates a fresh pre-restore backup, stages and counts media, stops GymGuide, restores MongoDB with `mongorestore --drop`, and swaps media. It checks the local API/database health afterward. On failure it attempts to restore the pre-restore database and media, and logs the outcome. It intentionally retains previous/failed media directories for review instead of silently deleting them. Verify several exercises, play and seek videos, inspect floor plans and markers, and sign in to `/admin` before returning the machine to member use. If rollback reports an error, keep the service stopped and use the retained pre-restore backup with operator assistance.

### Crash, restart and power-loss procedure

- **GymGuide process crash:** WinSW retries the service after 10 seconds and then 30 seconds for repeated failures. The wrapper and application logs are under ProgramData. Edge reloads the local URL; startup page refreshes until the API is ready.
- **MongoDB restart:** the MongoDB service must itself be configured to automatic startup/recovery during its separate installation. The MongoDB driver attempts to reconnect; the health check reports unavailable until a ping succeeds. If Sails does not recover from an extended database outage, restart the GymGuide service from Services or elevated PowerShell after confirming MongoDB is healthy.
- **Windows restart/power loss:** automatic recovery depends on both services set to automatic startup and the kiosk account configured for Assigned Access sign-in. The startup screen waits for MongoDB. Use a UPS if abrupt power cuts are common; MongoDB journal recovery and filesystem health depend on the hardware/storage.
- **Media/database discrepancy or disk failure:** stop GymGuide, preserve logs, restore a matched verified set, and inspect all media. Never run demo seed/reset against a customer database.

## 5. Updates, rollback and uninstall

Each installer writes to `Program Files\GymGuide\releases\<version>` and retains older version directories. `current` is a junction to the active release, so persistent database, media, settings and admin credentials are outside every release. The service uses the Node runtime bundled with the active release.

For an update (leave the optional service-registration task unchecked):

1. Build and audit a new offline payload; compile a versioned installer.
2. Transfer the signed/approved installer to the maintenance account and verify its release record/checksum.
3. Install the new version to its new version directory; do not remove old releases.
4. Run `tools\Update-GymGuide.ps1 -Version '<new-version>' -MongoDumpExe '<mongodump path>'` elevated. It creates and verifies a paired backup before downtime, stops the service, switches the `current` junction, restarts and polls the local health endpoint. On failed readiness it restores the prior junction and restarts the prior release.
5. Test member browsing, admin, media playback/seeking and floor plans. Keep the prior release and backup until the gym accepts the update.

The installer does not alter Assigned Access, Windows accounts, firewall or MongoDB configuration. Installing the service is an explicit unchecked installer task. Uninstall unregisters/stops only GymGuide and removes application files; its uninstall section intentionally does not remove the database, media, config, logs or backups. Preserve a verified off-machine backup before manually reclaiming disk space. Service removal script does not touch data.

## 6. Troubleshooting

| Symptom                         | Check                                                                                                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Startup screen remains          | Verify MongoDB service is running, its configured local port matches `MONGODB_URI`, and the service account can access MongoDB. Check `GymGuideService` and application logs. A TCP port open does not prove database authentication works. |
| Health returns 503              | Read `C:\ProgramData\GymGuide\logs`; verify URI, database account permissions, MongoDB readiness and the service's protected env file.                                                                                                      |
| Videos/images missing           | Check `GYMGUIDE_MEDIA_DIR`, LocalService ACL and free disk space; confirm DB/media came from the same backup.                                                                                                                               |
| Service fails immediately       | Check Node runtime and production dependency payload, `SESSION_SECRET` length, XML paths, file permissions and Windows Event Viewer service events.                                                                                         |
| Edge shows a connection failure | Check GymGuide service status and `http://127.0.0.1:1337/api/v1/health`; restart the service after MongoDB is ready. Verify Assigned Access URL and member sign-in.                                                                         |
| Admin access rejected           | Confirm the correct gym-specific staff account/password and that the database persisted; service restart invalidates active admin sessions.                                                                                                 |

The installer, WinSW service registration, MongoDB installation/configuration, accounts, Assigned Access, backup/restore, update and power-loss recovery have not been executed on the development PC. They must be rehearsed on a disposable Windows 11 Pro test machine with disposable data before customer rollout.
