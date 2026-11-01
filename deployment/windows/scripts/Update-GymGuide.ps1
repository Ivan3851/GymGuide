[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
  [Parameter(Mandatory = $true)][string]$Version,
  [Parameter(Mandatory = $true)][string]$MongoDumpExe,
  [string]$InstallRoot = "$env:ProgramFiles\GymGuide",
  [string]$DataRoot = "$env:ProgramData\GymGuide"
)

$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Run update from an elevated PowerShell window.' }
$release = Join-Path (Join-Path $InstallRoot 'releases') $Version
if ([IO.Path]::GetFileName($Version) -ne $Version) { throw 'Version must be a single folder name.' }
if (-not (Test-Path -LiteralPath (Join-Path $release 'app\scripts\start-production.js')) -or -not (Test-Path -LiteralPath (Join-Path $release 'runtime\node.exe'))) { throw "Versioned release is incomplete: $release" }
$current = Join-Path $InstallRoot 'current'
$currentVersionFile = Join-Path $InstallRoot 'current-version.txt'
$item = Get-Item -LiteralPath $current -Force -ErrorAction SilentlyContinue
if ($item -and -not ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw "Refusing to replace non-junction path $current" }
if ($item) {
  if (-not (Test-Path -LiteralPath $currentVersionFile -PathType Leaf)) { throw 'The current release version file is missing; inspect the installation before updating.' }
  $oldVersion = (Get-Content -LiteralPath $currentVersionFile -Raw).Trim()
  if ([IO.Path]::GetFileName($oldVersion) -ne $oldVersion) { throw 'The current release version metadata is invalid.' }
  $oldTarget = Join-Path (Join-Path $InstallRoot 'releases') $oldVersion
  if (-not (Test-Path -LiteralPath (Join-Path $oldTarget 'app\scripts\start-production.js'))) { throw 'The recorded previous release could not be found.' }
} else { $oldVersion = $null; $oldTarget = $null }

if ($PSCmdlet.ShouldProcess("GymGuide installation at $InstallRoot", "Back up data and switch to release $Version")) {
  & (Join-Path $PSScriptRoot 'Backup-GymGuide.ps1') -DataRoot $DataRoot -MongoDumpExe $MongoDumpExe | Out-Null
  $wasRunning = (Get-Service -Name GymGuide -ErrorAction SilentlyContinue).Status -eq 'Running'
  if ($wasRunning) { Stop-Service -Name GymGuide }
  try {
    if ($item) { Remove-Item -LiteralPath $current -Force }
    New-Item -ItemType Junction -Path $current -Target $release | Out-Null
    Set-Content -LiteralPath $currentVersionFile -Value $Version -Encoding ascii
    if ($wasRunning) {
      Start-Service -Name GymGuide
      $ready = $false
      for ($attempt = 0; $attempt -lt 30; $attempt++) {
        try {
          $health = Invoke-RestMethod -Uri 'http://127.0.0.1:1337/api/v1/health' -TimeoutSec 3
          if ($health.status -eq 'ok' -and $health.database -eq 'connected') { $ready = $true; break }
        } catch { Start-Sleep -Seconds 2 }
      }
      if (-not $ready) { throw 'New release did not pass the local readiness check.' }
    }
    Write-Host "GymGuide now points to release $Version. Previous version remains in releases for rollback."
  } catch {
    if ($wasRunning) { Stop-Service -Name GymGuide -ErrorAction SilentlyContinue }
    if (Test-Path -LiteralPath $current) { Remove-Item -LiteralPath $current -Force }
    if ($oldTarget) {
      New-Item -ItemType Junction -Path $current -Target $oldTarget | Out-Null
      Set-Content -LiteralPath $currentVersionFile -Value $oldVersion -Encoding ascii
    }
    if ($wasRunning) { Start-Service -Name GymGuide -ErrorAction SilentlyContinue }
    throw "Update failed and the previous release pointer was restored: $($_.Exception.Message)"
  }
}
