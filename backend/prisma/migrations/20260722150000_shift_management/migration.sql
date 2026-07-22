-- Sprint 14: Shift Management (groups, cycle, sessions, handover, operational status)

CREATE TYPE "ShiftKind" AS ENUM ('MORNING', 'EVENING');
CREATE TYPE "ShiftGroupCode" AS ENUM ('A', 'B', 'C', 'D');
CREATE TYPE "OperationalStatus" AS ENUM (
  'ON_DUTY',
  'ON_PATROL',
  'HANDLING_INCIDENT',
  'FIELD_TASK',
  'WITH_CCTV',
  'ON_BREAK',
  'OFF_DUTY'
);
CREATE TYPE "ShiftSessionStatus" AS ENUM ('OPEN', 'HANDOVER_PENDING', 'CLOSED');
CREATE TYPE "HandoverStepStatus" AS ENUM ('PENDING', 'APPROVED');

CREATE TABLE "shift_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" "ShiftGroupCode" NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "shift_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shift_groups_code_key" ON "shift_groups"("code");
CREATE INDEX "shift_groups_deletedAt_idx" ON "shift_groups"("deletedAt");

CREATE TABLE "shift_cycle_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cycleStartDate" DATE NOT NULL,
    "morningStartTime" TEXT NOT NULL DEFAULT '06:00',
    "morningEndTime" TEXT NOT NULL DEFAULT '18:00',
    "eveningStartTime" TEXT NOT NULL DEFAULT '18:00',
    "eveningEndTime" TEXT NOT NULL DEFAULT '06:00',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shift_cycle_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shift_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "ShiftKind" NOT NULL,
    "groupId" UUID NOT NULL,
    "cycleDay" INTEGER NOT NULL,
    "serviceDate" DATE NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "ShiftSessionStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shift_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shift_sessions_kind_startsAt_key" ON "shift_sessions"("kind", "startsAt");
CREATE INDEX "shift_sessions_groupId_idx" ON "shift_sessions"("groupId");
CREATE INDEX "shift_sessions_status_idx" ON "shift_sessions"("status");
CREATE INDEX "shift_sessions_serviceDate_idx" ON "shift_sessions"("serviceDate");

CREATE TABLE "shift_handovers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sessionId" UUID NOT NULL,
    "outgoingSupervisorId" UUID NOT NULL,
    "incomingSupervisorId" UUID NOT NULL,
    "openIncidentsCount" INTEGER NOT NULL DEFAULT 0,
    "closedIncidentsCount" INTEGER NOT NULL DEFAULT 0,
    "patrolsCount" INTEGER NOT NULL DEFAULT 0,
    "violationsCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "handoverStatus" "HandoverStepStatus" NOT NULL DEFAULT 'PENDING',
    "takeoverStatus" "HandoverStepStatus" NOT NULL DEFAULT 'PENDING',
    "handoverApprovedAt" TIMESTAMP(3),
    "takeoverApprovedAt" TIMESTAMP(3),
    "handoverApprovedById" UUID,
    "takeoverApprovedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shift_handovers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shift_handovers_sessionId_key" ON "shift_handovers"("sessionId");
CREATE INDEX "shift_handovers_outgoingSupervisorId_idx" ON "shift_handovers"("outgoingSupervisorId");
CREATE INDEX "shift_handovers_incomingSupervisorId_idx" ON "shift_handovers"("incomingSupervisorId");

CREATE TABLE "shift_alert_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sessionId" UUID NOT NULL,
    "alertKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shift_alert_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shift_alert_logs_sessionId_alertKey_key" ON "shift_alert_logs"("sessionId", "alertKey");
CREATE INDEX "shift_alert_logs_sessionId_idx" ON "shift_alert_logs"("sessionId");

ALTER TABLE "users" ADD COLUMN "groupId" UUID;
ALTER TABLE "users" ADD COLUMN "operationalStatus" "OperationalStatus" NOT NULL DEFAULT 'OFF_DUTY';
CREATE INDEX "users_groupId_idx" ON "users"("groupId");
CREATE INDEX "users_operationalStatus_idx" ON "users"("operationalStatus");

ALTER TABLE "shift_sessions" ADD CONSTRAINT "shift_sessions_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "shift_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "shift_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_outgoingSupervisorId_fkey"
  FOREIGN KEY ("outgoingSupervisorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_incomingSupervisorId_fkey"
  FOREIGN KEY ("incomingSupervisorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_handoverApprovedById_fkey"
  FOREIGN KEY ("handoverApprovedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_takeoverApprovedById_fkey"
  FOREIGN KEY ("takeoverApprovedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shift_alert_logs" ADD CONSTRAINT "shift_alert_logs_sessionId_fkey"
  FOREIGN KEY ("sessionId") REFERENCES "shift_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "users" ADD CONSTRAINT "users_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "shift_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
