param(
  [switch]$SkipMigrations
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$Backend = Join-Path $Root "backend"

if (-not (Test-Path (Join-Path $Backend ".env"))) {
  throw "backend\.env is missing. Run .\setup.ps1 first."
}
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
  throw "Node.js is not installed. Run .\setup.ps1 first."
}

$postgresBin = Join-Path $env:ProgramFiles "PostgreSQL\17\bin"
$pgIsReady = Get-Command pg_isready.exe -ErrorAction SilentlyContinue
if ($pgIsReady) {
  $pgIsReadyPath = $pgIsReady.Source
} elseif (Test-Path (Join-Path $postgresBin "pg_isready.exe")) {
  $pgIsReadyPath = Join-Path $postgresBin "pg_isready.exe"
} else {
  throw "PostgreSQL 17 tools are missing. Run .\setup.ps1 first."
}

$postgresService = Get-Service -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match "^postgresql.*17" } |
  Select-Object -First 1
if ($postgresService -and $postgresService.Status -ne "Running") {
  try {
    Start-Service -Name $postgresService.Name
  } catch {
    throw "PostgreSQL 17 is stopped. Start service '$($postgresService.Name)' as Administrator."
  }
}

& $pgIsReadyPath -h localhost -p 5432 | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "PostgreSQL 17 is not accepting connections on localhost:5432."
}

Push-Location $Backend
try {
  if (-not (Test-Path "node_modules")) {
    & npm.cmd install
    if ($LASTEXITCODE -ne 0) { throw "Backend dependency installation failed." }
  }

  if (-not $SkipMigrations) {
    & npx.cmd prisma generate
    if ($LASTEXITCODE -ne 0) { throw "Prisma client generation failed." }
    & npx.cmd prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { throw "Database migration failed." }
  }

  Write-Host "Backend API: http://localhost:3000" -ForegroundColor Green
  Write-Host "Health:      http://localhost:3000/health" -ForegroundColor Green
  & npm.cmd run dev
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
