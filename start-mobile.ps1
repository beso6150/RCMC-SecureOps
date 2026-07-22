param(
  [string]$Device,
  [string]$ApiBaseUrl
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Mobile = Join-Path $Root "mobile"
$MobileEnvironment = Join-Path $Mobile ".env"

if (-not (Get-Command flutter.bat -ErrorAction SilentlyContinue)) {
  throw "Flutter is not installed or is not on PATH. Run .\setup.ps1 first."
}
if (-not (Test-Path $MobileEnvironment)) {
  throw "mobile\.env is missing. Run .\setup.ps1 first."
}

if (-not $ApiBaseUrl) {
  $apiLine = Get-Content $MobileEnvironment |
    Where-Object { $_ -match "^\s*API_BASE_URL=" } |
    Select-Object -First 1
  if ($apiLine) {
    $ApiBaseUrl = ($apiLine -split "=", 2)[1].Trim()
  }
}
if (-not $ApiBaseUrl) {
  $ApiBaseUrl = "http://10.0.2.2:3000/api/v1"
}

Push-Location $Mobile
try {
  if (-not (Test-Path ".dart_tool\package_config.json")) {
    & flutter.bat pub get
    if ($LASTEXITCODE -ne 0) { throw "Flutter dependency installation failed." }
  }

  Write-Host "Mobile API: $ApiBaseUrl" -ForegroundColor Green
  $arguments = @("run", "--dart-define=API_BASE_URL=$ApiBaseUrl")
  if ($Device) {
    $arguments += @("-d", $Device)
  }
  & flutter.bat @arguments
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
