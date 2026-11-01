[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$AssetDirectory)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $AssetDirectory -PathType Container)) { throw "Production assets were not found: $AssetDirectory" }
$urlPattern = "(?i)https?://[a-z0-9.-]+(?:/[^\s\""'<>)]*)?"
$remoteUrls = @()
foreach ($asset in (Get-ChildItem -LiteralPath $AssetDirectory -File -Recurse)) {
  $text = Get-Content -LiteralPath $asset.FullName -Raw
  foreach ($match in [regex]::Matches($text, $urlPattern)) {
    $url = $match.Value.TrimEnd('.', ',', ';')
    $frameworkReference = $url -match '^https?://www\.w3\.org/(1998/Math/MathML|1999/xlink|2000/svg)$' -or
      $url -match '^https://vuejs\.org/error-reference/'
    if (-not $frameworkReference) { $remoteUrls += "$($asset.FullName): $url" }
  }
}
if ($remoteUrls.Count) {
  $remoteUrls | ForEach-Object { Write-Output "Remote URL found in production asset: $_" }
  throw 'Production assets contain a remote URL. Review each match before packaging an offline kiosk.'
}
Write-Host 'Offline asset audit passed: no external resources found (framework XML namespaces and diagnostic links are embedded strings only).'
