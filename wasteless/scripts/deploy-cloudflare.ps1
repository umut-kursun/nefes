# Build static export then deploy Worker + assets (Nefes-style).
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$apiPath = "src\app\api"
$apiBackup = "src\app\_api_dev_only"
$moved = $false

try {
  $pkg = Get-Content package.json -Raw | ConvertFrom-Json
  $currentVersion = [string]$pkg.version
  $newVersion = $currentVersion
  if ($currentVersion -match '^(?<prefix>.+-beta\.)(?<num>\d+)$') {
    $nextNum = [int]$Matches.num + 1
    $newVersion = "$($Matches.prefix)$nextNum"
  } elseif ($currentVersion -match '^\d+\.\d+\.\d+$') {
    $newVersion = "$currentVersion-beta.1"
  }

  if ($newVersion -ne $currentVersion) {
    $pkgPath = Join-Path (Get-Location) "package.json"
    $pkgRaw = Get-Content $pkgPath -Raw
    $pkgRaw2 = [regex]::Replace(
      $pkgRaw,
      '"version"\s*:\s*"[^"]+"',
      "`"version`": `"$newVersion`""
    )
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($pkgPath, $pkgRaw2, $utf8NoBom)
    Write-Host "Bumped package.json version: $currentVersion -> $newVersion"
  }

  $versionPayload = @{
    version = $newVersion
    builtAt = (Get-Date).ToUniversalTime().ToString("o")
  } | ConvertTo-Json -Compress
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText((Join-Path (Get-Location) "public\version.json"), $versionPayload, $utf8NoBom)
  Write-Host "Wrote public/version.json -> $newVersion"

  $appVersionFile = "src\lib\app-version.ts"
  if (Test-Path $appVersionFile) {
    $avPath = Join-Path (Get-Location) $appVersionFile
    $avInfo = Get-Item $avPath
    if ($avInfo.Length -gt 8192) {
      throw "app-version.ts is unexpectedly large ($($avInfo.Length) bytes); aborting to avoid corrupting the file"
    }
    $av = Get-Content $avPath -Raw
    if ($av -notmatch 'export const APP_VERSION = "[^"]+";') {
      throw "app-version.ts missing APP_VERSION export; aborting"
    }
    $av2 = [regex]::Replace($av, 'export const APP_VERSION = "[^"]+";', "export const APP_VERSION = `"$newVersion`";")
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($avPath, $av2, $utf8NoBom)
    Write-Host "Synced APP_VERSION -> $newVersion"
  }

  if (Test-Path $apiPath) {
    if (Test-Path $apiBackup) { Remove-Item -Recurse -Force $apiBackup }
    Move-Item $apiPath $apiBackup
    $moved = $true
    Write-Host "Temporarily moved src/app/api for static export"
  }

  $env:DEPLOY_TARGET = "cloudflare"
  $env:NODE_ENV = "production"
  $env:NEXT_PUBLIC_RECEIPT_ENGINE_DEBUG = "1"
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
