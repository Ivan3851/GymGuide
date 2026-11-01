[CmdletBinding()]
param(
  [string]$DataRoot = "$env:ProgramData\GymGuide",
  [string]$MongoServiceAccount = '',
  [string]$MongoServiceName = 'MongoDB'
)

$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Run GymGuide data initialization from an elevated PowerShell window.'
}
if (-not $MongoServiceAccount) {
  $mongoService = Get-CimInstance Win32_Service -Filter "Name='$MongoServiceName'" -ErrorAction SilentlyContinue
  $MongoServiceAccount = if ($mongoService -and $mongoService.StartName) {
    $mongoService.StartName
  } else {
    'NT AUTHORITY\NetworkService'
  }
}
$template = Join-Path $PSScriptRoot '..\gymguide.env.example'
foreach ($directory in @('config', 'data', 'data\mongodb', 'media', 'logs', 'logs\service', 'logs\mongodb', 'backups')) {
  New-Item -ItemType Directory -Path (Join-Path $DataRoot $directory) -Force | Out-Null
}

function Set-GymGuideDirectoryAccess([string]$Path, [string]$ServicePermission, [string]$AdditionalAccount) {
  $inheritance = & icacls.exe $Path /inheritance:r
  if ($LASTEXITCODE -ne 0) { throw "Could not restrict inherited permissions on $Path" }
  $rules = @('*S-1-5-18:(OI)(CI)F', '*S-1-5-32-544:(OI)(CI)F')
  if ($ServicePermission) { $rules += "*S-1-5-19:(OI)(CI)$ServicePermission" }
  if ($AdditionalAccount) { $rules += "${AdditionalAccount}:(OI)(CI)M" }
  $grant = & icacls.exe $Path /grant:r @rules
  if ($LASTEXITCODE -ne 0) { throw "Could not set GymGuide permissions on $Path" }
}

Set-GymGuideDirectoryAccess (Join-Path $DataRoot 'config') 'R' ''
Set-GymGuideDirectoryAccess (Join-Path $DataRoot 'data') '' $MongoServiceAccount
Set-GymGuideDirectoryAccess (Join-Path $DataRoot 'logs\mongodb') 'M' $MongoServiceAccount
Set-GymGuideDirectoryAccess (Join-Path $DataRoot 'media') 'M' ''
Set-GymGuideDirectoryAccess (Join-Path $DataRoot 'logs') 'M' ''
Set-GymGuideDirectoryAccess (Join-Path $DataRoot 'logs\service') 'M' ''
Set-GymGuideDirectoryAccess (Join-Path $DataRoot 'backups') '' ''

$destination = Join-Path $DataRoot 'config\gymguide.env'
if (Test-Path -LiteralPath $destination) {
  Write-Host "Existing configuration preserved: $destination"
} else {
  $secretBytes = [byte[]]::new(48)
  $random = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $random.GetBytes($secretBytes) } finally { $random.Dispose() }
  $secret = [Convert]::ToBase64String($secretBytes)
  $text = (Get-Content -LiteralPath $template -Raw).Replace('REPLACE_WITH_A_UNIQUE_RANDOM_SECRET_AT_LEAST_32_BYTES', $secret)
  Set-Content -LiteralPath $destination -Value $text -Encoding ascii
  Write-Host "Created local configuration at $destination. Review MongoDB and gym settings before service startup."
}
$fileAcl = & icacls.exe $destination /inheritance:r /grant:r '*S-1-5-18:F' '*S-1-5-32-544:F' '*S-1-5-19:R'
if ($LASTEXITCODE -ne 0) { throw 'Could not protect the local GymGuide environment file.' }
