# Releasing and updating offline installations

This is the intended local release path implemented by the scripts under `deployment/windows`. Treat the exact runtime and dependencies as release inputs; do not assume a payload has passed kiosk acceptance merely because a build succeeds.

## Build a payload

On a trusted build machine:

1. Review source changes, run tests/lint/format/build and audit locked production dependencies.
2. Record exact Node runtime, MongoDB Server, MongoDB Database Tools, WinSW and GymGuide versions. Validate the chosen adapter/driver/runtime/server together.
3. Supply local Node runtime, API production-only `node_modules`, and reviewed WinSW executable to `Build-OfflinePayload.ps1`. It does not download them.
4. Inspect the payload and run `Audit-OfflineAssets.ps1`; include no `.env`, secrets, real data or uploads.
5. Compile `deployment/windows/GymGuide.iss` with Inno Setup and create a release record/checksum. Keep MongoDB Server and Database Tools installation media separate.

Example commands are in [`deployment/windows/README.md`](../deployment/windows/README.md). Never run a release script against a live gym without first understanding the target and its backup state.

## Update an installed kiosk

1. Produce and review the new offline package on the build machine.
2. Transfer it via approved media; verify the checksum/release record.
3. Install new version in its versioned Program Files release directory. Preserve old releases and ProgramData.
4. Run elevated `Update-GymGuide.ps1` with the exact new version and mongodump path. The script creates a matched database/media backup, switches the active junction, starts service and polls health; failed readiness restores the prior junction and starts the previous app.
5. Test member routes, admin login, uploads/images/videos/seeking and floor markers. Keep previous release and verified backup until gym acceptance.

Do not manually overwrite current app files or copy media into a release folder. Data schema migrations are configured safe; if a future release needs a destructive or incompatible migration, it needs a separately designed migration and rollback procedure before release.

## Backup and restore commands

Backups are manual, not scheduled. Example from elevated PowerShell:

```powershell
& "$env:ProgramFiles\GymGuide\tools\Backup-GymGuide.ps1" `
  -MongoDumpExe 'C:\Program Files\MongoDB\Tools\bin\mongodump.exe' `
  -RetainCount 10 `
  -DestinationRoot 'E:\GymGuideBackups'
```

Restore is destructive to the configured local GymGuide database and media. Confirm the intended target, backup manifest, and external copy before execution:

```powershell
& "$env:ProgramFiles\GymGuide\tools\Restore-GymGuide.ps1" `
  -BackupPath 'E:\GymGuideBackups\GymGuide-<timestamp>' `
  -MongoRestoreExe 'C:\Program Files\MongoDB\Tools\bin\mongorestore.exe' `
  -MongoDumpExe 'C:\Program Files\MongoDB\Tools\bin\mongodump.exe'
```

Restore creates a pre-restore backup, stages/checks media, uses `mongorestore --drop`, and attempts rollback on failure. It retains prior/failed media directories for inspection. Validate after restore by opening exercises, playing/seeking videos, checking floor plans/markers, and signing in to admin. Do not test restore on real data without an approved backup and recovery plan.

## Rollback

An application-only regression can be rolled back with `Update-GymGuide.ps1` selecting the prior release, but only if data schema remains compatible. The update script backs up data before switching. A database/media restore is a separate destructive recovery action; use only the matched backup and operator guide. Preserve logs and previous releases until acceptance completes.
