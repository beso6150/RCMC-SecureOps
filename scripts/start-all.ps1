param(
  [switch]$Mobile,
  [string]$MobileDevice
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

if (-not (Test-Path (Join-Path $Root "backend\.env"))) {
  throw "Project is not configured. Run .\setup.ps1 first."
}

Write-Host "Starting backend and web in separate PowerShell windows..." -ForegroundColor Cyan
Start-Process powershell.exe -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-File", (Join-Path $Root "start-backend.ps1")
)
Start-Sleep -Seconds 2
Start-Process powershell.exe -ArgumentList @(
  "-NoExit",
  "-ExecutionPolicy", "Bypass",
  "-File", (Join-Path $Root "start-web.ps1")
)

if ($Mobile) {
  $mobileArguments = @(
    "-NoExit",
    "-ExecutionPolicy", "Bypass",
    "-File", (Join-Path $Root "start-mobile.ps1")
  )
  if ($MobileDevice) {
    $mobileArguments += @("-Device", $MobileDevice)
  }
  Start-Process powershell.exe -ArgumentList $mobileArguments
}

Write-Host "Backend: http://localhost:3000" -ForegroundColor Green
Write-Host "Web:     http://localhost:5173" -ForegroundColor Green
if (-not $Mobile) {
  Write-Host "Mobile:  run .\start-mobile.ps1 when an emulator/device is ready."
}
