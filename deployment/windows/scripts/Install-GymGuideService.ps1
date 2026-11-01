[CmdletBinding()]
param(
  [string]$InstallRoot = "$env:ProgramFiles\GymGuide",
  [string]$DataRoot = "$env:ProgramData\GymGuide",
  [string]$MongoServiceName = 'MongoDB',
  [string]$ReleaseVersion = ''
)

$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Run this service installation script from an elevated PowerShell window.'
}

$wrapper = Join-Path $InstallRoot 'GymGuideService.exe'
$config = Join-Path $InstallRoot 'GymGuideService.xml'
$envFile = Join-Path $DataRoot 'config\gymguide.env'
foreach ($required in @($wrapper, $config, $envFile)) {
  if (-not (Test-Path -LiteralPath $required -PathType Leaf)) { throw "Required installation file is missing: $required" }
}

$current = Join-Path $InstallRoot 'current'
$currentVersionFile = Join-Path $InstallRoot 'current-version.txt'
if (Test-Path -LiteralPath $current) {
  $currentItem = Get-Item -LiteralPath $current -Force
  if (-not ($currentItem.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw "Refusing to use a non-junction current path: $current" }
  if (-not (Test-Path -LiteralPath $currentVersionFile -PathType Leaf)) { throw 'The current release version file is missing; inspect the installation before changing it.' }
  $activeVersion = (Get-Content -LiteralPath $currentVersionFile -Raw).Trim()
  if ([IO.Path]::GetFileName($activeVersion) -ne $activeVersion -or -not (Test-Path -LiteralPath (Join-Path (Join-Path $InstallRoot 'releases') "$activeVersion\app\scripts\start-production.js"))) { throw 'The recorded current release is invalid.' }
} else {
  if (-not $ReleaseVersion) { throw 'Specify -ReleaseVersion to select the initial versioned release.' }
  $release = Join-Path (Join-Path $InstallRoot 'releases') $ReleaseVersion
  if (-not (Test-Path -LiteralPath (Join-Path $release 'app\scripts\start-production.js')) -or -not (Test-Path -LiteralPath (Join-Path $release 'runtime\node.exe'))) { throw "Versioned release is incomplete: $release" }
  New-Item -ItemType Junction -Path $current -Target $release | Out-Null
  Set-Content -LiteralPath $currentVersionFile -Value $ReleaseVersion -Encoding ascii
}
foreach ($required in @((Join-Path $current 'runtime\node.exe'), (Join-Path $current 'app\scripts\start-production.js'))) {
  if (-not (Test-Path -LiteralPath $required -PathType Leaf)) { throw "Current release is incomplete: $required" }
}

$mongoService = Get-Service -Name $MongoServiceName -ErrorAction SilentlyContinue
if (-not $mongoService) { throw "MongoDB Windows service '$MongoServiceName' is not installed. Install and configure MongoDB separately first." }
if ($mongoService.Status -ne 'Running') { throw "MongoDB service '$MongoServiceName' is not running. Start and verify MongoDB before installing GymGuide." }

foreach ($directory in @('data', 'logs', 'logs\service', 'backups', 'media')) {
  New-Item -ItemType Directory -Path (Join-Path $DataRoot $directory) -Force | Out-Null
}
foreach ($directoryName in @('config', 'data', 'logs', 'serviceLogs', 'media', 'backups')) {
  $relativePath = if ($directoryName -eq 'serviceLogs') { 'logs\service' } else { $directoryName }
  $servicePermission = switch ($directoryName) {
    'config' { 'R' }
    { $_ -in @('logs', 'serviceLogs', 'media') } { 'M' }
    default { '' }
  }
  $target = Join-Path $DataRoot $relativePath
  $inheritance = & icacls.exe $target /inheritance:r
  if ($LASTEXITCODE -ne 0) { throw "Could not restrict inherited permissions on $target" }
  $rules = @('*S-1-5-18:(OI)(CI)F', '*S-1-5-32-544:(OI)(CI)F')
  if ($servicePermission) { $rules += "*S-1-5-19:(OI)(CI)$servicePermission" }
  $grant = & icacls.exe $target /grant:r @rules
  if ($LASTEXITCODE -ne 0) { throw "Could not set service permissions on $target" }
}
$fileAcl = & icacls.exe $envFile /inheritance:r /grant:r '*S-1-5-18:F' '*S-1-5-32-544:F' '*S-1-5-19:R'
if ($LASTEXITCODE -ne 0) { throw 'Could not protect the local GymGuide environment file.' }

& $wrapper install
if ($LASTEXITCODE -ne 0) { throw 'WinSW could not install the GymGuide service.' }
Set-Service -Name 'GymGuide' -StartupType Automatic
Start-Service -Name 'GymGuide'
Write-Host 'GymGuide service installed and started. MongoDB service configuration was not changed.'
