param(
  [string]$PostgresSuperuser = "postgres",
  [string]$PostgresSuperPassword = "secureops_dev_password",
  [string]$DatabaseUser = "secureops",
  [string]$DatabasePassword = "secureops_dev_password",
  [string]$DatabaseName = "rcmc_secureops",
  [int]$PostgresPort = 5432,
  [switch]$ForceEnvironment
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

function Refresh-Path {
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machinePath;$userPath"
}

function Install-WingetPackage {
  param(
    [Parameter(Mandatory = $true)][string]$Id,
    [string]$Override
  )

  if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
    throw "winget is required to install $Id. Install App Installer from Microsoft Store and run setup.ps1 again."
  }

  Write-Host "Installing $Id..." -ForegroundColor Cyan
  $arguments = @(
    "install", "--exact", "--id", $Id,
    "--silent", "--accept-package-agreements", "--accept-source-agreements"
  )
  if ($Override) {
    $arguments += @("--override", $Override)
  }
  & winget.exe @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "winget failed to install $Id (exit code $LASTEXITCODE)."
  }
  Refresh-Path
}

function Find-PostgresBin {
  $pgIsReady = Get-Command pg_isready.exe -ErrorAction SilentlyContinue
  if ($pgIsReady) {
    return Split-Path -Parent $pgIsReady.Source
  }

  $standardPath = Join-Path $env:ProgramFiles "PostgreSQL\17\bin"
  if (Test-Path (Join-Path $standardPath "pg_isready.exe")) {
    return $standardPath
  }
  return $null
}

function Install-FlutterSdk {
  $installParent = Join-Path $env:LOCALAPPDATA "Programs"
  $flutterRoot = Join-Path $installParent "flutter"
  $archivePath = Join-Path $env:TEMP "flutter-stable-windows.zip"
  $manifestUrl = "https://storage.googleapis.com/flutter_infra_release/releases/releases_windows.json"

  Write-Host "Downloading the current stable Flutter SDK..." -ForegroundColor Cyan
  $manifest = Invoke-RestMethod -Uri $manifestUrl
  $stableHash = $manifest.current_release.stable
  $release = $manifest.releases |
    Where-Object { $_.hash -eq $stableHash } |
    Select-Object -First 1
  if (-not $release) {
    throw "Could not resolve the current stable Flutter SDK release."
  }

  $downloadUrl = "$($manifest.base_url)/$($release.archive)"
  New-Item -ItemType Directory -Force -Path $installParent | Out-Null
  Invoke-WebRequest -Uri $downloadUrl -OutFile $archivePath
  if (Test-Path $flutterRoot) {
    Remove-Item -Recurse -Force $flutterRoot
  }
  Expand-Archive -Path $archivePath -DestinationPath $installParent -Force
  Remove-Item -Force $archivePath

  $flutterBin = Join-Path $flutterRoot "bin"
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $userParts = @($userPath -split ";" | Where-Object { $_ })
  if ($userParts -notcontains $flutterBin) {
    $newUserPath = (($userParts + $flutterBin) -join ";")
    [Environment]::SetEnvironmentVariable("Path", $newUserPath, "User")
  }
  Refresh-Path
}

function New-RandomSecret {
  $bytes = New-Object byte[] 48
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $generator.GetBytes($bytes)
  } finally {
    $generator.Dispose()
  }
  return [Convert]::ToBase64String($bytes)
}

function Write-EnvironmentFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  if ((Test-Path $Path) -and -not $ForceEnvironment) {
    Write-Host "Keeping existing environment file: $Path"
    return
  }
  [IO.File]::WriteAllText($Path, $Content, (New-Object Text.UTF8Encoding($false)))
  Write-Host "Generated environment file: $Path" -ForegroundColor Green
}

Write-Host "==> RCMC SecureOps native Windows setup" -ForegroundColor Cyan

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
  Install-WingetPackage -Id "OpenJS.NodeJS.LTS"
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  throw "npm was not found after installing Node.js. Open a new PowerShell window and run setup.ps1 again."
}

$nodeMajor = [int]((& node.exe --version).TrimStart("v").Split(".")[0])
if ($nodeMajor -lt 22) {
  throw "Node.js 22 or newer is required. Installed version: $(& node.exe --version)"
}

if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) {
  Install-WingetPackage -Id "Git.Git"
}

if (-not (Get-Command flutter.bat -ErrorAction SilentlyContinue)) {
  Install-FlutterSdk
}
if (-not (Get-Command flutter.bat -ErrorAction SilentlyContinue)) {
  throw "Flutter was not found after SDK installation. Open a new PowerShell window and run setup.ps1 again."
}

$postgresBin = Find-PostgresBin
if (-not $postgresBin) {
  $postgresOverride = "--mode unattended --unattendedmodeui none --superpassword `"$PostgresSuperPassword`" --serverport $PostgresPort"
  Install-WingetPackage -Id "PostgreSQL.PostgreSQL.17" -Override $postgresOverride
  $postgresBin = Find-PostgresBin
}
if (-not $postgresBin) {
  throw "PostgreSQL 17 tools were not found. Expected: $env:ProgramFiles\PostgreSQL\17\bin"
}
$env:Path = "$postgresBin;$env:Path"

$postgresService = Get-Service -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match "^postgresql.*17" } |
  Select-Object -First 1
if ($postgresService -and $postgresService.Status -ne "Running") {
  Write-Host "Starting PostgreSQL 17 service..."
  try {
    Start-Service -Name $postgresService.Name
  } catch {
    throw "Could not start $($postgresService.Name). Run PowerShell as Administrator, then retry."
  }
}

Write-Host "Waiting for PostgreSQL 17 on localhost:$PostgresPort..."
$ready = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  & "$postgresBin\pg_isready.exe" -h localhost -p $PostgresPort | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $ready = $true
    break
  }
  Start-Sleep -Seconds 1
}
if (-not $ready) {
  throw "PostgreSQL 17 is not accepting connections on localhost:$PostgresPort."
}

if ($DatabaseUser -notmatch "^[A-Za-z_][A-Za-z0-9_]*$") {
  throw "DatabaseUser contains unsupported characters."
}
if ($DatabaseName -notmatch "^[A-Za-z_][A-Za-z0-9_]*$") {
  throw "DatabaseName contains unsupported characters."
}

$previousPgPassword = $env:PGPASSWORD
$env:PGPASSWORD = $PostgresSuperPassword
try {
  $escapedDatabasePassword = $DatabasePassword.Replace("'", "''")
  $roleExists = & "$postgresBin\psql.exe" -h localhost -p $PostgresPort -U $PostgresSuperuser -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DatabaseUser';"
  if ($LASTEXITCODE -ne 0) {
    throw "Could not authenticate as PostgreSQL superuser '$PostgresSuperuser'. Re-run setup.ps1 with the correct -PostgresSuperPassword."
  }

  if (-not ($roleExists -match "1")) {
    Write-Host "Creating database role '$DatabaseUser'..."
    & "$postgresBin\psql.exe" -h localhost -p $PostgresPort -U $PostgresSuperuser -d postgres -v ON_ERROR_STOP=1 -c "CREATE ROLE `"$DatabaseUser`" LOGIN PASSWORD '$escapedDatabasePassword';"
  } else {
    & "$postgresBin\psql.exe" -h localhost -p $PostgresPort -U $PostgresSuperuser -d postgres -v ON_ERROR_STOP=1 -c "ALTER ROLE `"$DatabaseUser`" WITH LOGIN PASSWORD '$escapedDatabasePassword';"
  }
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to configure database role '$DatabaseUser'."
  }

  $databaseExists = & "$postgresBin\psql.exe" -h localhost -p $PostgresPort -U $PostgresSuperuser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DatabaseName';"
  if (-not ($databaseExists -match "1")) {
    Write-Host "Creating database '$DatabaseName'..."
    & "$postgresBin\createdb.exe" -h localhost -p $PostgresPort -U $PostgresSuperuser -O $DatabaseUser $DatabaseName
    if ($LASTEXITCODE -ne 0) {
      throw "Failed to create database '$DatabaseName'."
    }
  }
} finally {
  $env:PGPASSWORD = $previousPgPassword
}

$encodedUser = [Uri]::EscapeDataString($DatabaseUser)
$encodedPassword = [Uri]::EscapeDataString($DatabasePassword)
$databaseUrl = "postgresql://${encodedUser}:${encodedPassword}@localhost:$PostgresPort/${DatabaseName}?schema=public"
$accessSecret = New-RandomSecret
$refreshSecret = New-RandomSecret

$rootEnvironment = @"
POSTGRES_HOST=localhost
POSTGRES_PORT=$PostgresPort
POSTGRES_USER=$DatabaseUser
POSTGRES_PASSWORD=$DatabasePassword
POSTGRES_DB=$DatabaseName
API_PORT=3000
"@

$backendEnvironment = @"
NODE_ENV=development
PORT=3000
DATABASE_URL=$databaseUrl
JWT_ACCESS_SECRET=$accessSecret
JWT_ACCESS_TTL=15m
JWT_REFRESH_SECRET=$refreshSecret
JWT_REFRESH_TTL=7d
BCRYPT_ROUNDS=12
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000
"@

$webEnvironment = @"
VITE_API_BASE_URL=http://localhost:3000/api/v1
"@

$mobileEnvironment = @"
API_BASE_URL=http://10.0.2.2:3000/api/v1
"@

Write-EnvironmentFile -Path (Join-Path $Root ".env") -Content $rootEnvironment
Write-EnvironmentFile -Path (Join-Path $Root "backend\.env") -Content $backendEnvironment
Write-EnvironmentFile -Path (Join-Path $Root "web\.env") -Content $webEnvironment
Write-EnvironmentFile -Path (Join-Path $Root "mobile\.env") -Content $mobileEnvironment

Write-Host "==> Installing backend dependencies"
Push-Location (Join-Path $Root "backend")
try {
  & npm.cmd install
  if ($LASTEXITCODE -ne 0) { throw "Backend npm install failed." }
  & npx.cmd prisma generate
  if ($LASTEXITCODE -ne 0) { throw "Prisma client generation failed." }
  & npx.cmd prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { throw "Prisma migration failed." }
  & npx.cmd prisma db seed
  if ($LASTEXITCODE -ne 0) { throw "Database seed failed." }
} finally {
  Pop-Location
}

Write-Host "==> Installing web dependencies"
Push-Location (Join-Path $Root "web")
try {
  & npm.cmd install
  if ($LASTEXITCODE -ne 0) { throw "Web npm install failed." }
} finally {
  Pop-Location
}

Write-Host "==> Installing Flutter dependencies"
Push-Location (Join-Path $Root "mobile")
try {
  & flutter.bat pub get
  if ($LASTEXITCODE -ne 0) { throw "Flutter dependency installation failed." }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Start services in separate PowerShell windows:"
Write-Host "  .\start-backend.ps1"
Write-Host "  .\start-web.ps1"
Write-Host "  .\start-mobile.ps1"
