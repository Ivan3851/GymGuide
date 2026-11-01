[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Version,
  [Parameter(Mandatory = $true)][string]$NodeRuntimeDirectory,
  [Parameter(Mandatory = $true)][string]$ApiProductionNodeModules,
  [Parameter(Mandatory = $true)][string]$WinSwExecutable,
  [Parameter(Mandatory = $true)][string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
foreach ($path in @($NodeRuntimeDirectory, $ApiProductionNodeModules, $WinSwExecutable)) {
  if (-not (Test-Path -LiteralPath $path)) { throw "Required offline build input was not found: $path" }
}
if (-not (Test-Path -LiteralPath (Join-Path $NodeRuntimeDirectory 'node.exe')) -or -not (Test-Path -LiteralPath (Join-Path $ApiProductionNodeModules 'sails\bin\sails.js'))) {
  throw 'Provide a tested Node runtime directory and API production node_modules directory.'
}
if (Test-Path -LiteralPath $OutputDirectory) { throw "Output directory already exists; choose a new versioned output path: $OutputDirectory" }

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$output = [IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $output -Force | Out-Null
$releaseApp = Join-Path $output 'app'
$releaseRuntime = Join-Path $output 'runtime'
New-Item -ItemType Directory -Path $releaseApp -Force | Out-Null
Push-Location $repoRoot
try {
  & npm.cmd --prefix apps/web run build
  if ($LASTEXITCODE -ne 0) { throw 'Vite production build failed.' }
  $apiSource = Join-Path $repoRoot 'apps\api'
  Get-ChildItem -LiteralPath $apiSource | Where-Object {
    $_.Name -notin @('node_modules', 'test', 'assets', '.tmp', 'coverage', '.git') -and
    ($_.Name -eq '.env.example' -or $_.Name -notlike '.env*')
  } | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $releaseApp -Recurse -Force
  }
  Copy-Item -LiteralPath (Join-Path $apiSource 'assets') -Destination (Join-Path $releaseApp 'assets') -Recurse -Force
  New-Item -ItemType Directory -Path (Join-Path $releaseApp 'node_modules') | Out-Null
  Get-ChildItem -LiteralPath $ApiProductionNodeModules | Copy-Item -Destination (Join-Path $releaseApp 'node_modules') -Recurse
  New-Item -ItemType Directory -Path $releaseRuntime | Out-Null
  Get-ChildItem -LiteralPath $NodeRuntimeDirectory | Copy-Item -Destination $releaseRuntime -Recurse
  Copy-Item -LiteralPath $WinSwExecutable -Destination (Join-Path $output 'GymGuideService.exe')
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot '..\service\GymGuideService.xml') -Destination (Join-Path $output 'GymGuideService.xml')
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot '..\gymguide.env.example') -Destination (Join-Path $output 'gymguide.env.example')
  New-Item -ItemType Directory -Path (Join-Path $output 'tools') | Out-Null
  Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.ps1' | Where-Object { $_.Name -ne 'Build-OfflinePayload.ps1' } | Copy-Item -Destination (Join-Path $output 'tools')
  [ordered]@{ version = $Version; nodeVersion = (& (Join-Path $releaseRuntime 'node.exe') -v); builtAtUtc = [DateTime]::UtcNow.ToString('o') } |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $releaseApp 'version.json') -Encoding utf8
  $secretFiles = @(Get-ChildItem -LiteralPath $output -File -Recurse | Where-Object {
    $_.Name -match '^\.env(?:\.|$)' -and $_.Name -ne '.env.example'
  })
  if ($secretFiles.Count) { throw "Secret-like env files found in staged payload: $($secretFiles.FullName -join ', ')" }
} finally { Pop-Location }

& (Join-Path $PSScriptRoot 'Audit-OfflineAssets.ps1') -AssetDirectory (Join-Path $releaseApp 'assets')
Write-Host "Offline payload staged at $output. It is ready for manual inspection and optional Inno Setup compilation."
