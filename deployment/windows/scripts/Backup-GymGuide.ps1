[CmdletBinding()]
param(
  [string]$DataRoot = "$env:ProgramData\GymGuide",
  [Parameter(Mandatory = $true)][string]$MongoDumpExe,
  [int]$RetainCount = 10,
  [string]$DestinationRoot = ''
)

$ErrorActionPreference = 'Stop'
if ($RetainCount -lt 1) { throw 'RetainCount must be at least 1.' }
$configPath = Join-Path $DataRoot 'config\gymguide.env'
if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) { throw 'GymGuide configuration is missing.' }
if (-not (Test-Path -LiteralPath $MongoDumpExe -PathType Leaf)) { throw 'mongodump.exe was not found.' }
$configText = Get-Content -LiteralPath $configPath -Raw
$uriMatch = [regex]::Match($configText, '(?m)^\s*MONGODB_URI\s*=\s*(?:"([^"]+)"|''([^'']+)''|([^\r\n#]+))')
if (-not $uriMatch.Success) { throw 'MONGODB_URI is missing from GymGuide configuration.' }
$mongoUri = ($uriMatch.Groups[1..3] | Where-Object Success | Select-Object -First 1).Value.Trim()
$destination = if ($DestinationRoot) { $DestinationRoot } else { Join-Path $DataRoot 'backups' }
New-Item -ItemType Directory -Path $destination -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $DataRoot 'logs') -Force | Out-Null
$stamp = [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmssZ')
$finalPath = Join-Path $destination "GymGuide-$stamp"
$partialPath = "$finalPath.partial"
$logPath = Join-Path $DataRoot 'logs\backup.log'
$service = Get-Service -Name 'GymGuide' -ErrorAction SilentlyContinue
$serviceWasRunning = $service -and $service.Status -eq 'Running'

try {
  if ($serviceWasRunning) { Stop-Service -Name 'GymGuide' -ErrorAction Stop }
  New-Item -ItemType Directory -Path $partialPath -ErrorAction Stop | Out-Null
  $archivePath = Join-Path $partialPath 'database.archive.gz'
  $dump = Start-Process -FilePath $MongoDumpExe -ArgumentList @('--uri', ('"{0}"' -f $mongoUri), '--archive', ('"{0}"' -f $archivePath), '--gzip') -Wait -PassThru -NoNewWindow
  if ($dump.ExitCode -ne 0 -or -not (Test-Path -LiteralPath $archivePath -PathType Leaf) -or (Get-Item -LiteralPath $archivePath).Length -eq 0) {
    throw "mongodump failed with exit code $($dump.ExitCode)."
  }
  $mediaPath = Join-Path $DataRoot 'media'
  $backupMedia = Join-Path $partialPath 'media'
  if (-not (Test-Path -LiteralPath $mediaPath -PathType Container)) { throw "Media directory not found: $mediaPath" }
  New-Item -ItemType Directory -Path $backupMedia | Out-Null
  Get-ChildItem -LiteralPath $mediaPath -Force | Copy-Item -Destination $backupMedia -Recurse -Force
  $sourceFiles = @(Get-ChildItem -LiteralPath $mediaPath -File -Recurse)
  $backupFiles = @(Get-ChildItem -LiteralPath $backupMedia -File -Recurse)
  $sourceBytes = ($sourceFiles | Measure-Object -Property Length -Sum).Sum
  $backupBytes = ($backupFiles | Measure-Object -Property Length -Sum).Sum
  if ($sourceFiles.Count -ne $backupFiles.Count -or $sourceBytes -ne $backupBytes) { throw 'Media backup validation failed: file counts or byte totals differ.' }
  $manifest = [ordered]@{
    formatVersion = 1
    createdAtUtc = [DateTime]::UtcNow.ToString('o')
    appVersion = 'see GymGuide version file in installation'
    databaseArchive = 'database.archive.gz'
    mediaDirectory = 'media'
    mediaFileCount = $backupFiles.Count
    mediaBytes = [long]$backupBytes
    databaseAndMediaAreMatchedSet = $true
  }
  $manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $partialPath 'manifest.json') -Encoding utf8
  $check = Get-Content -LiteralPath (Join-Path $partialPath 'manifest.json') -Raw | ConvertFrom-Json
  if (-not $check.databaseAndMediaAreMatchedSet -or -not (Test-Path -LiteralPath (Join-Path $partialPath $check.databaseArchive)) -or -not (Test-Path -LiteralPath (Join-Path $partialPath $check.mediaDirectory) -PathType Container)) {
    throw 'Backup manifest validation failed.'
  }
  Move-Item -LiteralPath $partialPath -Destination $finalPath
  Add-Content -LiteralPath $logPath -Value "[$([DateTime]::UtcNow.ToString('o'))] Backup verified: $finalPath"

  $validBackups = @()
  foreach ($candidate in (Get-ChildItem -LiteralPath $destination -Directory | Where-Object Name -Like 'GymGuide-*' | Sort-Object Name -Descending)) {
    try {
      $candidateManifest = Get-Content -LiteralPath (Join-Path $candidate.FullName 'manifest.json') -Raw | ConvertFrom-Json
      if ($candidateManifest.databaseAndMediaAreMatchedSet -and
        (Test-Path -LiteralPath (Join-Path $candidate.FullName $candidateManifest.databaseArchive) -PathType Leaf) -and
        (Test-Path -LiteralPath (Join-Path $candidate.FullName $candidateManifest.mediaDirectory) -PathType Container)) {
        $validBackups += $candidate
      }
    } catch { }
  }
  $oldBackups = @($validBackups | Select-Object -Skip $RetainCount)
  foreach ($old in $oldBackups) { Remove-Item -LiteralPath $old.FullName -Recurse -Force }
  if ($serviceWasRunning) { Start-Service -Name 'GymGuide' -ErrorAction Stop }
  Write-Output $finalPath
} catch {
  Add-Content -LiteralPath $logPath -Value "[$([DateTime]::UtcNow.ToString('o'))] Backup failed: $($_.Exception.Message)"
  if (Test-Path -LiteralPath $partialPath) { Remove-Item -LiteralPath $partialPath -Recurse -Force }
  if ($serviceWasRunning) { Start-Service -Name 'GymGuide' -ErrorAction SilentlyContinue }
  throw
}
