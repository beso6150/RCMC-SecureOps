-- Sprint 15: Field Operations & Security Map

-- AlterEnum: parking locations
ALTER TYPE "ParkingLocationCode" ADD VALUE IF NOT EXISTS 'BASEMENT_P1';
ALTER TYPE "ParkingLocationCode" ADD VALUE IF NOT EXISTS 'BASEMENT_P2';

-- CreateEnums
CREATE TYPE "SecurityZoneType" AS ENUM (
  'BUILDING', 'FLOOR', 'HALL', 'OFFICE', 'PARKING', 'ENTRANCE', 'EXIT',
  'SECURITY_POINT', 'CCTV_AREA', 'RESTRICTED_AREA', 'OTHER'
);

CREATE TYPE "CheckpointType" AS ENUM (
  'ENTRANCE', 'EXIT', 'FLOOR_POINT', 'PARKING_POINT', 'CAMERA_POINT',
  'FIRE_EXIT', 'RESTRICTED_POINT', 'GENERAL'
);

CREATE TYPE "PatrolSessionStatus" AS ENUM (
  'SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'LATE', 'MISSED', 'CANCELLED'
);

CREATE TYPE "PatrolVerificationMethod" AS ENUM (
  'MANUAL', 'QR_CODE', 'NFC', 'SUPERVISOR_CONFIRMATION'
);

CREATE TYPE "PatrolVisitStatus" AS ENUM (
  'VERIFIED', 'SKIPPED', 'FAILED', 'OUT_OF_ORDER'
);

CREATE TYPE "PersonnelLocationSource" AS ENUM (
  'MOBILE', 'MANUAL', 'CHECKPOINT', 'INCIDENT', 'SUPERVISOR'
);

CREATE TYPE "FieldAlertType" AS ENUM (
  'SOS', 'PATROL_DELAY', 'CHECKPOINT_MISSED', 'RESTRICTED_AREA',
  'OFFLINE_USER', 'INCIDENT_NEARBY', 'SECURITY_NOTICE', 'OTHER'
);

CREATE TYPE "FieldAlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "FieldAlertStatus" AS ENUM (
  'NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'
);

-- security_zones
CREATE TABLE "security_zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "zoneType" "SecurityZoneType" NOT NULL,
    "parentId" UUID,
    "floorNumber" INTEGER,
    "mapX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mapY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "color" TEXT NOT NULL DEFAULT '#0f766e',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "security_zones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "security_zones_code_key" ON "security_zones"("code");
CREATE INDEX "security_zones_parentId_idx" ON "security_zones"("parentId");
CREATE INDEX "security_zones_zoneType_idx" ON "security_zones"("zoneType");
CREATE INDEX "security_zones_isActive_idx" ON "security_zones"("isActive");

ALTER TABLE "security_zones"
  ADD CONSTRAINT "security_zones_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "security_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- security_checkpoints
CREATE TABLE "security_checkpoints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "zoneId" UUID NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "mapX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mapY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "checkpointType" "CheckpointType" NOT NULL DEFAULT 'GENERAL',
    "qrCodeValue" TEXT NOT NULL,
    "nfcTagValue" TEXT,
    "requiredForPatrol" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "security_checkpoints_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "security_checkpoints_code_key" ON "security_checkpoints"("code");
CREATE UNIQUE INDEX "security_checkpoints_qrCodeValue_key" ON "security_checkpoints"("qrCodeValue");
CREATE INDEX "security_checkpoints_zoneId_idx" ON "security_checkpoints"("zoneId");
CREATE INDEX "security_checkpoints_checkpointType_idx" ON "security_checkpoints"("checkpointType");
CREATE INDEX "security_checkpoints_isActive_idx" ON "security_checkpoints"("isActive");

ALTER TABLE "security_checkpoints"
  ADD CONSTRAINT "security_checkpoints_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "security_zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- patrol_routes
CREATE TABLE "patrol_routes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "shiftType" TEXT,
    "groupId" UUID,
    "estimatedDurationMinutes" INTEGER NOT NULL DEFAULT 60,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "patrol_routes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "patrol_routes_groupId_idx" ON "patrol_routes"("groupId");
CREATE INDEX "patrol_routes_isActive_idx" ON "patrol_routes"("isActive");

ALTER TABLE "patrol_routes"
  ADD CONSTRAINT "patrol_routes_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "shift_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- patrol_route_checkpoints
CREATE TABLE "patrol_route_checkpoints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "routeId" UUID NOT NULL,
    "checkpointId" UUID NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "expectedMinutesFromStart" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patrol_route_checkpoints_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "patrol_route_checkpoints_routeId_checkpointId_key" ON "patrol_route_checkpoints"("routeId", "checkpointId");
CREATE UNIQUE INDEX "patrol_route_checkpoints_routeId_orderIndex_key" ON "patrol_route_checkpoints"("routeId", "orderIndex");
CREATE INDEX "patrol_route_checkpoints_checkpointId_idx" ON "patrol_route_checkpoints"("checkpointId");

ALTER TABLE "patrol_route_checkpoints"
  ADD CONSTRAINT "patrol_route_checkpoints_routeId_fkey"
  FOREIGN KEY ("routeId") REFERENCES "patrol_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "patrol_route_checkpoints"
  ADD CONSTRAINT "patrol_route_checkpoints_checkpointId_fkey"
  FOREIGN KEY ("checkpointId") REFERENCES "security_checkpoints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- patrol_sessions
CREATE TABLE "patrol_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "routeId" UUID NOT NULL,
    "assignedUserId" UUID,
    "assignedById" UUID,
    "shiftSessionId" UUID,
    "groupId" UUID,
    "status" "PatrolSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledStartAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "notes" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "overrideRestingGroup" BOOLEAN NOT NULL DEFAULT false,
    "overrideReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "patrol_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "patrol_sessions_routeId_idx" ON "patrol_sessions"("routeId");
CREATE INDEX "patrol_sessions_assignedUserId_idx" ON "patrol_sessions"("assignedUserId");
CREATE INDEX "patrol_sessions_status_idx" ON "patrol_sessions"("status");
CREATE INDEX "patrol_sessions_scheduledStartAt_idx" ON "patrol_sessions"("scheduledStartAt");
CREATE INDEX "patrol_sessions_groupId_idx" ON "patrol_sessions"("groupId");

ALTER TABLE "patrol_sessions"
  ADD CONSTRAINT "patrol_sessions_routeId_fkey"
  FOREIGN KEY ("routeId") REFERENCES "patrol_routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "patrol_sessions"
  ADD CONSTRAINT "patrol_sessions_assignedUserId_fkey"
  FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "patrol_sessions"
  ADD CONSTRAINT "patrol_sessions_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "patrol_sessions"
  ADD CONSTRAINT "patrol_sessions_shiftSessionId_fkey"
  FOREIGN KEY ("shiftSessionId") REFERENCES "shift_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "patrol_sessions"
  ADD CONSTRAINT "patrol_sessions_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "shift_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- patrol_checkpoint_visits
CREATE TABLE "patrol_checkpoint_visits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "patrolSessionId" UUID NOT NULL,
    "checkpointId" UUID NOT NULL,
    "visitedById" UUID NOT NULL,
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationMethod" "PatrolVerificationMethod" NOT NULL DEFAULT 'MANUAL',
    "mapX" DOUBLE PRECISION,
    "mapY" DOUBLE PRECISION,
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "status" "PatrolVisitStatus" NOT NULL DEFAULT 'VERIFIED',
    "clientSyncId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "patrol_checkpoint_visits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "patrol_checkpoint_visits_patrolSessionId_checkpointId_key" ON "patrol_checkpoint_visits"("patrolSessionId", "checkpointId");
CREATE UNIQUE INDEX "patrol_checkpoint_visits_clientSyncId_key" ON "patrol_checkpoint_visits"("clientSyncId");
CREATE INDEX "patrol_checkpoint_visits_patrolSessionId_idx" ON "patrol_checkpoint_visits"("patrolSessionId");
CREATE INDEX "patrol_checkpoint_visits_checkpointId_idx" ON "patrol_checkpoint_visits"("checkpointId");
CREATE INDEX "patrol_checkpoint_visits_visitedById_idx" ON "patrol_checkpoint_visits"("visitedById");
CREATE INDEX "patrol_checkpoint_visits_visitedAt_idx" ON "patrol_checkpoint_visits"("visitedAt");

ALTER TABLE "patrol_checkpoint_visits"
  ADD CONSTRAINT "patrol_checkpoint_visits_patrolSessionId_fkey"
  FOREIGN KEY ("patrolSessionId") REFERENCES "patrol_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "patrol_checkpoint_visits"
  ADD CONSTRAINT "patrol_checkpoint_visits_checkpointId_fkey"
  FOREIGN KEY ("checkpointId") REFERENCES "security_checkpoints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "patrol_checkpoint_visits"
  ADD CONSTRAINT "patrol_checkpoint_visits_visitedById_fkey"
  FOREIGN KEY ("visitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- personnel_locations
CREATE TABLE "personnel_locations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "zoneId" UUID,
    "mapX" DOUBLE PRECISION NOT NULL,
    "mapY" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "source" "PersonnelLocationSource" NOT NULL DEFAULT 'MOBILE',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "personnel_locations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "personnel_locations_userId_isCurrent_idx" ON "personnel_locations"("userId", "isCurrent");
CREATE INDEX "personnel_locations_userId_recordedAt_idx" ON "personnel_locations"("userId", "recordedAt");
CREATE INDEX "personnel_locations_zoneId_idx" ON "personnel_locations"("zoneId");
CREATE INDEX "personnel_locations_recordedAt_idx" ON "personnel_locations"("recordedAt");

ALTER TABLE "personnel_locations"
  ADD CONSTRAINT "personnel_locations_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "personnel_locations"
  ADD CONSTRAINT "personnel_locations_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "security_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- field_alerts
CREATE TABLE "field_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "alertType" "FieldAlertType" NOT NULL,
    "severity" "FieldAlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "zoneId" UUID,
    "assignedUserId" UUID,
    "assignedGroupId" UUID,
    "incidentId" UUID,
    "patrolSessionId" UUID,
    "mapX" DOUBLE PRECISION,
    "mapY" DOUBLE PRECISION,
    "status" "FieldAlertStatus" NOT NULL DEFAULT 'NEW',
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "field_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "field_alerts_status_idx" ON "field_alerts"("status");
CREATE INDEX "field_alerts_severity_idx" ON "field_alerts"("severity");
CREATE INDEX "field_alerts_alertType_idx" ON "field_alerts"("alertType");
CREATE INDEX "field_alerts_assignedUserId_idx" ON "field_alerts"("assignedUserId");
CREATE INDEX "field_alerts_zoneId_idx" ON "field_alerts"("zoneId");
CREATE INDEX "field_alerts_patrolSessionId_idx" ON "field_alerts"("patrolSessionId");
CREATE INDEX "field_alerts_createdAt_idx" ON "field_alerts"("createdAt");

ALTER TABLE "field_alerts"
  ADD CONSTRAINT "field_alerts_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "security_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "field_alerts"
  ADD CONSTRAINT "field_alerts_assignedUserId_fkey"
  FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "field_alerts"
  ADD CONSTRAINT "field_alerts_assignedGroupId_fkey"
  FOREIGN KEY ("assignedGroupId") REFERENCES "shift_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "field_alerts"
  ADD CONSTRAINT "field_alerts_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "field_alerts"
  ADD CONSTRAINT "field_alerts_patrolSessionId_fkey"
  FOREIGN KEY ("patrolSessionId") REFERENCES "patrol_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "field_alerts"
  ADD CONSTRAINT "field_alerts_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Extend incidents
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "zoneId" UUID;
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "checkpointId" UUID;
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "patrolSessionId" UUID;
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "mapX" DOUBLE PRECISION;
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "mapY" DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "incidents_zoneId_idx" ON "incidents"("zoneId");
CREATE INDEX IF NOT EXISTS "incidents_checkpointId_idx" ON "incidents"("checkpointId");
CREATE INDEX IF NOT EXISTS "incidents_patrolSessionId_idx" ON "incidents"("patrolSessionId");

ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "security_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_checkpointId_fkey"
  FOREIGN KEY ("checkpointId") REFERENCES "security_checkpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_patrolSessionId_fkey"
  FOREIGN KEY ("patrolSessionId") REFERENCES "patrol_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Extend vehicle_violations
ALTER TABLE "vehicle_violations" ADD COLUMN IF NOT EXISTS "zoneId" UUID;
ALTER TABLE "vehicle_violations" ADD COLUMN IF NOT EXISTS "checkpointId" UUID;
ALTER TABLE "vehicle_violations" ADD COLUMN IF NOT EXISTS "mapX" DOUBLE PRECISION;
ALTER TABLE "vehicle_violations" ADD COLUMN IF NOT EXISTS "mapY" DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "vehicle_violations_zoneId_idx" ON "vehicle_violations"("zoneId");
CREATE INDEX IF NOT EXISTS "vehicle_violations_checkpointId_idx" ON "vehicle_violations"("checkpointId");

ALTER TABLE "vehicle_violations"
  ADD CONSTRAINT "vehicle_violations_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "security_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vehicle_violations"
  ADD CONSTRAINT "vehicle_violations_checkpointId_fkey"
  FOREIGN KEY ("checkpointId") REFERENCES "security_checkpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
