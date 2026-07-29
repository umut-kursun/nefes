# Build static export then deploy Worker + assets (Nefes-style).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$apiPath = "src\app\api"
$apiBackup = "src\app\_api_dev_only"
$moved = $false

try {
  $pkg = Get-Content package.json -Raw | ConvertFrom-Json
  $versionPayload = @{
    version = $pkg.version
    builtAt = (Get-Date).ToUniversalTime().ToString("o")
  } | ConvertTo-Json -Compress
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText((Join-Path (Get-Location) "public\version.json"), $versionPayload, $utf8NoBom)
  Write-Host "Wrote public/version.json → $($pkg.version)"

  $appVersionFile = "src\lib\app-version.ts"
  if (Test-Path $appVersionFile) {
    $av = Get-Content $appVersionFile -Raw
    $av2 = [regex]::Replace($av, 'export const APP_VERSION = "[^"]+";', "export const APP_VERSION = `"$($pkg.version)`";")
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText((Join-Path (Get-Location) $appVersionFile), $av2, $utf8NoBom)
    Write-Host "Synced APP_VERSION → $($pkg.version)"
  }

  if (Test-Path $apiPath) {
    if (Test-Path $apiBackup) { Remove-Item -Recurse -Force $apiBackup }
    Move-Item $apiPath $apiBackup
    $moved = $true
    Write-Host "Temporarily moved src/app/api for static export"
  }

  $env:DEPLOY_TARGET = "cloudflare"
  $env:NODE_ENV = "production"
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "next build failed" }

  if (-not (Test-Path "out\version.json")) {
    Copy-Item "public\version.json" "out\version.json" -Force
  }

  npx wrangler deploy --config wrangler.toml
  if ($LASTEXITCODE -ne 0) { throw "wrangler deploy failed" }
}
finally {
  if ($moved -and (Test-Path $apiBackup)) {
    if (Test-Path $apiPath) { Remove-Item -Recurse -Force $apiPath }
    Move-Item $apiBackup $apiPath
    Write-Host "Restored src/app/api"
  }
}
