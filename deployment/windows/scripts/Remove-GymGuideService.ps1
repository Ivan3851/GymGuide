[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param([string]$InstallRoot = "$env:ProgramFiles\GymGuide")

$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Run this service removal script from an elevated PowerShell window.'
}

$wrapper = Join-Path $InstallRoot 'GymGuideService.exe'
if (-not (Test-Path -LiteralPath $wrapper -PathType Leaf)) { throw "WinSW executable not found: $wrapper" }
if ($PSCmdlet.ShouldProcess('GymGuide Windows service', 'Stop and unregister')) {
  $service = Get-Service -Name 'GymGuide' -ErrorAction SilentlyContinue
  if ($service) {
    if ($service.Status -ne 'Stopped') { Stop-Service -Name 'GymGuide' }
    & $wrapper uninstall
    if ($LASTEXITCODE -ne 0) { throw 'WinSW could not remove the GymGuide service.' }
  }
  $current = Join-Path $InstallRoot 'current'
  $currentVersionFile = Join-Path $InstallRoot 'current-version.txt'
  if (Test-Path -LiteralPath $current) {
    $item = Get-Item -LiteralPath $current -Force
    if (-not ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw "Refusing to remove non-junction application path: $current" }
    if (-not (Test-Path -LiteralPath $currentVersionFile -PathType Leaf)) { throw 'The current release version file is missing; manual junction review required.' }
    $version = (Get-Content -LiteralPath $currentVersionFile -Raw).Trim()
    if ([IO.Path]::GetFileName($version) -ne $version -or -not (Test-Path -LiteralPath (Join-Path (Join-Path $InstallRoot 'releases') "$version\app\scripts\start-production.js"))) { throw 'Current release metadata is invalid; manual junction review required.' }
    Remove-Item -LiteralPath $current -Force
  }
  if (Test-Path -LiteralPath $currentVersionFile) { Remove-Item -LiteralPath $currentVersionFile -Force }
  Write-Host 'GymGuide service removed. ProgramData, MongoDB, media, logs and backups were preserved.'
}
