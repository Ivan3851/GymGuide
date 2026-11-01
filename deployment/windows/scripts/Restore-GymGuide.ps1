[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
  [Parameter(Mandatory = $true)][string]$BackupPath,
  [string]$InstallRoot = "$env:ProgramFiles\GymGuide",
  [string]$DataRoot = "$env:ProgramData\GymGuide",
  [Parameter(Mandatory = $true)][string]$MongoRestoreExe,
  [Parameter(Mandatory = $true)][string]$MongoDumpExe
)

$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Run restore from an elevated PowerShell window.' }
$backup = (Resolve-Path -LiteralPath $BackupPath).Path
$manifestPath = Join-Path $backup 'manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw 'Selected backup has no manifest.json.' }
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($manifest.formatVersion -ne 1 -or -not $manifest.databaseAndMediaAreMatchedSet) { throw 'Backup format is unsupported or is not a matched database/media set.' }
$archive = Join-Path $backup $manifest.databaseArchive
$backupMedia = Join-Path $backup $manifest.mediaDirectory
if (-not (Test-Path -LiteralPath $archive -PathType Leaf) -or (Get-Item -LiteralPath $archive).Length -eq 0) { throw 'The backup database archive is missing or empty.' }
if (-not (Test-Path -LiteralPath $backupMedia -PathType Container)) { throw 'The backup media directory is missing.' }
if (-not (Test-Path -LiteralPath $MongoRestoreExe -PathType Leaf) -or -not (Test-Path -LiteralPath $MongoDumpExe -PathType Leaf)) { throw 'MongoDB Database Tools (mongorestore.exe and mongodump.exe) are required.' }
$configPath = Join-Path $DataRoot 'config\gymguide.env'
$configText = Get-Content -LiteralPath $configPath -Raw
$uriMatch = [regex]::Match($configText, '(?m)^\s*MONGODB_URI\s*=\s*(?:"([^"]+)"|''([^'']+)''|([^\r\n#]+))')
if (-not $uriMatch.Success) { throw 'MONGODB_URI is missing from GymGuide configuration.' }
$mongoUri = ($uriMatch.Groups[1..3] | Where-Object Success | Select-Object -First 1).Value.Trim()
$mediaPath = Join-Path $DataRoot 'media'
$stamp = [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmssZ')
$stagedMedia = Join-Path $DataRoot "media.restore.$stamp"
$previousMedia = Join-Path $DataRoot "media.before-restore.$stamp"
$serviceWasRunning = (Get-Service -Name GymGuide -ErrorAction SilentlyContinue).Status -eq 'Running'
$logPath = Join-Path $DataRoot 'logs\restore.log'
New-Item -ItemType Directory -Path (Join-Path $DataRoot 'logs') -Force | Out-Null

if ($PSCmdlet.ShouldProcess("GymGuide database and media on this PC", "Restore matched backup $backup")) {
  $preRestoreBackup = (& (Join-Path $PSScriptRoot 'Backup-GymGuide.ps1') -DataRoot $DataRoot -MongoDumpExe $MongoDumpExe | Select-Object -Last 1)
  if (-not $preRestoreBackup -or -not (Test-Path -LiteralPath (Join-Path $preRestoreBackup 'database.archive.gz'))) { throw 'Could not create the required pre-restore backup.' }
  New-Item -ItemType Directory -Path $stagedMedia -Force | Out-Null
  Get-ChildItem -LiteralPath $backupMedia -Force | Copy-Item -Destination $stagedMedia -Recurse -Force
  $stagedFiles = @(Get-ChildItem -LiteralPath $stagedMedia -File -Recurse)
  $stagedBytes = ($stagedFiles | Measure-Object -Property Length -Sum).Sum
  if ($stagedFiles.Count -ne [int]$manifest.mediaFileCount -or $stagedBytes -ne [long]$manifest.mediaBytes) { throw 'Selected media backup does not match its manifest.' }

  if ($serviceWasRunning) { Stop-Service -Name GymGuide -ErrorAction Stop }
  $mediaMoved = $false
  $databaseRestoreAttempted = $false
  $databaseRollbackFailed = $false
  try {
    if (Test-Path -LiteralPath $mediaPath) {
      Move-Item -LiteralPath $mediaPath -Destination $previousMedia
      $mediaMoved = $true
    }
    Move-Item -LiteralPath $stagedMedia -Destination $mediaPath
    $mediaMoved = $true
    $databaseRestoreAttempted = $true
    $restore = Start-Process -FilePath $MongoRestoreExe -ArgumentList @('--uri', ('"{0}"' -f $mongoUri), '--archive', ('"{0}"' -f $archive), '--gzip', '--drop') -Wait -PassThru -NoNewWindow
    if ($restore.ExitCode -ne 0) { throw "mongorestore failed with exit code $($restore.ExitCode)." }
    if ($serviceWasRunning) {
      Start-Service -Name GymGuide
      $ready = $false
      for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try {
          $health = Invoke-RestMethod -Uri 'http://127.0.0.1:1337/api/v1/health' -TimeoutSec 3
          if ($health.status -eq 'ok' -and $health.database -eq 'connected') { $ready = $true; break }
        } catch { Start-Sleep -Seconds 2 }
      }
      if (-not $ready) { throw 'GymGuide did not pass its local API/database health check after restore.' }
    }
    Add-Content -LiteralPath $logPath -Value "[$([DateTime]::UtcNow.ToString('o'))] Restore verified from $backup. Previous media retained at $previousMedia"
    Write-Host "Restore completed. Verify exercises, videos, floor plans and administrator login. Previous media remains at $previousMedia."
    if (-not $serviceWasRunning) { Write-Warning 'GymGuide was stopped before restore and remains stopped; start it to run the health check.' }
  } catch {
    if ($serviceWasRunning) { Stop-Service -Name GymGuide -ErrorAction SilentlyContinue }
    if ($databaseRestoreAttempted) {
      $rollback = Start-Process -FilePath $MongoRestoreExe -ArgumentList @('--uri', ('"{0}"' -f $mongoUri), '--archive', ('"{0}"' -f (Join-Path $preRestoreBackup 'database.archive.gz')), '--gzip', '--drop') -Wait -PassThru -NoNewWindow
      if ($rollback.ExitCode -ne 0) { $databaseRollbackFailed = $true }
    }
    if ($mediaMoved) {
      if (Test-Path -LiteralPath $mediaPath) { Move-Item -LiteralPath $mediaPath -Destination (Join-Path $DataRoot "media.failed-restore.$stamp") }
      if (Test-Path -LiteralPath $previousMedia) { Move-Item -LiteralPath $previousMedia -Destination $mediaPath }
    }
    if ($serviceWasRunning -and -not $databaseRollbackFailed) { Start-Service -Name GymGuide -ErrorAction SilentlyContinue }
    Add-Content -LiteralPath $logPath -Value "[$([DateTime]::UtcNow.ToString('o'))] Restore failed: $($_.Exception.Message)"
    if ($databaseRollbackFailed) { throw 'Restore failed and automatic database rollback also failed. Keep GymGuide stopped and use the pre-restore backup.' }
    throw
  }
}
