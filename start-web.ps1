param(
  [int]$Port = 5173
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Web = Join-Path $Root "web"

if (-not (Test-Path (Join-Path $Web ".env"))) {
  throw "web\.env is missing. Run .\setup.ps1 first."
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw "Node.js/npm is not installed. Run .\setup.ps1 first."
}

Push-Location $Web
try {
  if (-not (Test-Path "node_modules")) {
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) { throw "Web dependency installation failed." }
  }

  Write-Host "React dashboard: http://localhost:$Port" -ForegroundColor Green
  & npm.cmd run dev -- --port $Port
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
