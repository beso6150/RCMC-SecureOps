# RCMC SecureOps

Arabic RTL security operations platform consisting of:

- Node.js 22+ API (`backend/`)
- React dashboard (`web/`)
- Flutter mobile app (`mobile/`)
- PostgreSQL 17 local database

## Native Windows development

Docker is not required for development. PostgreSQL 17 runs as a native Windows service.

### Automated setup

Open PowerShell in the repository root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\setup.ps1
```

`setup.ps1`:

1. Installs Node.js, Git, and PostgreSQL 17 with `winget` when missing.
2. Downloads the current stable Flutter SDK from Google's official release
   storage when Flutter is missing.
3. Starts the PostgreSQL 17 Windows service.
4. Creates the `secureops` role and `rcmc_secureops` database.
5. Generates all local `.env` files.
6. Installs backend, web, and Flutter dependencies.
7. Generates Prisma Client, deploys migrations, and seeds the database.

The default fresh-install PostgreSQL superuser password is
`secureops_dev_password`. For an existing PostgreSQL installation, supply its
actual superuser password:

```powershell
.\setup.ps1 -PostgresSuperPassword "your-postgres-password"
```

To regenerate environment files:

```powershell
.\setup.ps1 -PostgresSuperPassword "your-postgres-password" -ForceEnvironment
```

### Start each application

Use separate PowerShell windows:

```powershell
.\start-backend.ps1
.\start-web.ps1
.\start-mobile.ps1
```

Endpoints:

- API: `http://localhost:3000`
- Health check: `http://localhost:3000/health`
- React dashboard: `http://localhost:5173`
- Android emulator API: `http://10.0.2.2:3000/api/v1`

To select a Flutter device or override the API URL:

```powershell
flutter devices
.\start-mobile.ps1 -Device emulator-5554
.\start-mobile.ps1 -Device <device-id> -ApiBaseUrl http://192.168.1.10:3000/api/v1
```

For a physical phone, use the Windows machine's LAN address and allow inbound
TCP port 3000 in Windows Firewall.

To start backend and web together:

```powershell
npm run start:all
```

Include mobile when a device is ready:

```powershell
.\scripts\start-all.ps1 -Mobile -MobileDevice emulator-5554
```

## Local environment files

Setup generates:

- `.env` — local PostgreSQL coordinates
- `backend/.env` — API, database, JWT, and CORS settings
- `web/.env` — dashboard API URL
- `mobile/.env` — Flutter API URL

Templates are provided as `.env.example` files. Local `.env` files are ignored
by Git.

## PostgreSQL 17

Expected native installation:

- Service: `postgresql-x64-17` (or another service name ending in `17`)
- Tools: `C:\Program Files\PostgreSQL\17\bin`
- Host/port: `localhost:5432`
- Database: `rcmc_secureops`
- Application role: `secureops`

Useful commands:

```powershell
Get-Service *postgres*
Start-Service postgresql-x64-17
& "C:\Program Files\PostgreSQL\17\bin\pg_isready.exe" -h localhost -p 5432
```

## Database migrations and seed

```powershell
npm run db:migrate
npm run db:seed
```

Seeded logins use the employee number as the initial password:

| Role | National ID | Employee number |
|---|---|---|
| Security Director | `1000000001` | `EMP-DIR-001` |
| Security Guard | `1000000002` | `EMP-GRD-001` |
| Security Supervisor | `1000000003` | `EMP-SUP-001` |
| CCTV Operator | `1000000004` | `EMP-CCTV-001` |

## Verification and builds

```powershell
npm run backend:lint
npm run backend:build
npm run web:build
npm run mobile:analyze
```

## Optional Docker production deployment

Docker Compose is retained only as an optional production deployment path. It
uses PostgreSQL 17 and is not referenced by setup or development scripts.

```powershell
Copy-Item .env.production.example .env.production
# Set strong passwords, JWT secrets, and the production CORS origin.
docker compose --env-file .env.production up -d --build
```

Do not deploy with the local development credentials.

## Shift management (Sprint 14)

Automatic 8-day cycle for groups A–D (4 work / 4 rest):

- Days 1–4: Morning = A, Evening = B, Rest = C + D
- Days 5–8: Morning = C, Evening = D, Rest = A + B

Web routes: `/shifts`, `/shifts/handover`, `/shifts/statistics`  
API: `/api/v1/shifts`

After updating, apply migration and seed:

```powershell
cd backend
npx prisma migrate deploy
npx prisma db seed
```

## Troubleshooting

- `P1001` from Prisma: start the PostgreSQL 17 Windows service and verify port
  5432.
- PostgreSQL authentication failure: rerun setup with the correct
  `-PostgresSuperPassword`.
- Flutter cannot reach the API: use `10.0.2.2` for Android Emulator or the
  Windows LAN IP for a physical device.
- CORS rejection: add the dashboard origin to `CORS_ORIGINS` in
  `backend/.env`, then restart the backend.
