# Fast local Chrome run (release)
# Debug browser refresh is slow by design — use this for realistic load/refresh speed.

$ErrorActionPreference = "Stop"
$env:Path = "C:\Users\ukursun\develop\flutter\bin;" + $env:Path

Set-Location $PSScriptRoot\..

Write-Host "Starting NEFES in release mode (local CanvasKit, no CDN)..."
flutter run -d chrome --release --no-web-resources-cdn --web-port=8080
