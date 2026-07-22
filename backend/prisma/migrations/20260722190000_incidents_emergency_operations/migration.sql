-- Sprint 17: Incidents, Emergencies & Operations Room

-- Expand existing enums (Postgres ADD VALUE; IF NOT EXISTS for re-runs)
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'REPORTED';
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED';
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'ASSESSING';
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'RESPONDING';
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'ON_SCENE';
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'CONTAINED';
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'RESOLVED';
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'ESCALATED';
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'REOPENED';
ALTER TYPE "IncidentStatus" ADD VALUE IF NOT EXISTS 'FALSE_ALARM';

ALTER TYPE "IncidentHistoryAction" ADD VALUE IF NOT EXISTS 'REPORTED';
ALTER TYPE "IncidentHistoryAction" ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED';
ALTER TYPE "IncidentHistoryAction" ADD VALUE IF NOT EXISTS 'ASSESSMENT_ADDED';
ALTER TYPE "IncidentHistoryAction" ADD VALUE IF NOT EXISTS 'REASSIGNED';
ALTER TYPE "IncidentHistoryAction" ADD VALUE IF NOT EXISTS 'RESPONSE_STARTED';
ALTER TYPE "IncidentHistoryAction" ADD VALUE IF NOT EXISTS 'ARRIVED';
ALTER TYPE "IncidentHistoryAction" ADD VALUE IF NOT EXISTS 'CONTAINED';
ALTER TYPE "IncidentHistoryAction" ADD VALUE IF NOT EXISTS 'NOTE_ADDED';
ALTER TYPE "IncidentHistoryAction" ADD VALUE IF NOT EXISTS 'CONTACT_LOGGED';
ALTER TYPE "IncidentHistoryAction" ADD VALUE IF NOT EXISTS 'ESCALATED';
ALTER TYPE "IncidentHistoryAction" ADD VALUE IF NOT EXISTS 'RESOLVED';
ALTER TYPE "IncidentHistoryAction" ADD VALUE IF NOT EXISTS 'REOPENED';
ALTER TYPE "IncidentHistoryAction" ADD VALUE IF NOT EXISTS 'FALSE_ALARM';
ALTER TYPE "IncidentHistoryAction" ADD VALUE IF NOT EXISTS 'FOLLOW_UP_CREATED';
ALTER TYPE "IncidentHistoryAction" ADD VALUE IF NOT EXISTS 'SUPPORT_REQUESTED';

ALTER TYPE "AttachmentType" ADD VALUE IF NOT EXISTS 'SCREENSHOT';
ALTER TYPE "AttachmentType" ADD VALUE IF NOT EXISTS 'VIDEO_SHORT';
ALTER TYPE "AttachmentType" ADD VALUE IF NOT EXISTS 'AUDIO';

-- New enums
CREATE TYPE "IncidentSource" AS ENUM (
  'SECURITY_GUARD',
  'SUPERVISOR',
  'CCTV_OPERATOR',
  'CCTV_REFERRAL',
  'PATROL',
  'FIELD_ALERT',
  'SOS',
  'VEHICLE_VIOLATION',
  'VISITOR',
  'OPERATIONS_ROOM',
  'SYSTEM',
  'OTHER'
);

CREATE TYPE "IncidentAssignmentType" AS ENUM (
  'PRIMARY',
  'SUPPORT',
  'SUPERVISOR',
  'CCTV_SUPPORT',
  'MEDICAL_SUPPORT',
  'OPERATIONS_SUPPORT'
);

CREATE TYPE "IncidentNoteType" AS ENUM (
  'GENERAL',
  'FIELD_UPDATE',
  'OPERATIONS_NOTE',
  'SUPERVISOR_NOTE',
  'CCTV_NOTE',
  'CONFIDENTIAL',
  'FOLLOW_UP'
);

CREATE TYPE "IncidentNoteVisibility" AS ENUM (
  'ALL_AUTHORIZED',
  'OPERATIONS_ONLY',
  'SUPERVISORS_ONLY',
  'DIRECTORS_ONLY'
);

CREATE TYPE "IncidentContactType" AS ENUM (
  'INTERNAL_SECURITY',
  'MEDICAL_TEAM',
  'FACILITIES',
  'FIRE_SAFETY',
  'CIVIL_DEFENSE',
  'AMBULANCE',
  'POLICE',
  'MANAGEMENT',
  'HOST',
  'OTHER'
);

CREATE TYPE "IncidentTaskStatus" AS ENUM (
  'PENDING',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'OVERDUE'
);

CREATE TYPE "IncidentFollowUpStatus" AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'OVERDUE',
  'CANCELLED'
);

-- Expand incidents table
ALTER TABLE "incidents"
  ADD COLUMN IF NOT EXISTS "incidentNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "source" "IncidentSource",
  ADD COLUMN IF NOT EXISTS "floorNumber" INTEGER,
  ADD COLUMN IF NOT EXISTS "locationDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "assignedGroupId" UUID,
  ADD COLUMN IF NOT EXISTS "assignedById" UUID,
  ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "acknowledgedById" UUID,
  ADD COLUMN IF NOT EXISTS "acknowledgedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "assessedById" UUID,
  ADD COLUMN IF NOT EXISTS "assessedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "closedById" UUID,
  ADD COLUMN IF NOT EXISTS "reportedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "responseStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "arrivedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "containedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
  ADD COLUMN IF NOT EXISTS "falseAlarmReason" TEXT,
  ADD COLUMN IF NOT EXISTS "resolutionSummary" TEXT,
  ADD COLUMN IF NOT EXISTS "rootCause" TEXT,
  ADD COLUMN IF NOT EXISTS "actionsTaken" TEXT,
  ADD COLUMN IF NOT EXISTS "recommendations" TEXT,
  ADD COLUMN IF NOT EXISTS "assessmentJson" JSONB,
  ADD COLUMN IF NOT EXISTS "requiresFollowUp" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "followUpDueAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "escalationLevel" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "escalatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "escalationReason" TEXT,
  ADD COLUMN IF NOT EXISTS "relatedReferralId" UUID,
  ADD COLUMN IF NOT EXISTS "relatedPermitId" UUID,
  ADD COLUMN IF NOT EXISTS "relatedViolationId" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "incidents_incidentNumber_key" ON "incidents"("incidentNumber");
CREATE INDEX IF NOT EXISTS "incidents_source_idx" ON "incidents"("source");
CREATE INDEX IF NOT EXISTS "incidents_relatedReferralId_idx" ON "incidents"("relatedReferralId");
CREATE INDEX IF NOT EXISTS "incidents_relatedPermitId_idx" ON "incidents"("relatedPermitId");
CREATE INDEX IF NOT EXISTS "incidents_relatedViolationId_idx" ON "incidents"("relatedViolationId");

ALTER TABLE "incidents"
  DROP CONSTRAINT IF EXISTS "incidents_assignedGroupId_fkey";
ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_assignedGroupId_fkey"
  FOREIGN KEY ("assignedGroupId") REFERENCES "shift_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incidents"
  DROP CONSTRAINT IF EXISTS "incidents_assignedById_fkey";
ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incidents"
  DROP CONSTRAINT IF EXISTS "incidents_acknowledgedById_fkey";
ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_acknowledgedById_fkey"
  FOREIGN KEY ("acknowledgedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incidents"
  DROP CONSTRAINT IF EXISTS "incidents_assessedById_fkey";
ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_assessedById_fkey"
  FOREIGN KEY ("assessedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incidents"
  DROP CONSTRAINT IF EXISTS "incidents_closedById_fkey";
ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_closedById_fkey"
  FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incidents"
  DROP CONSTRAINT IF EXISTS "incidents_relatedReferralId_fkey";
ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_relatedReferralId_fkey"
  FOREIGN KEY ("relatedReferralId") REFERENCES "security_referrals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incidents"
  DROP CONSTRAINT IF EXISTS "incidents_relatedPermitId_fkey";
ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_relatedPermitId_fkey"
  FOREIGN KEY ("relatedPermitId") REFERENCES "security_permits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incidents"
  DROP CONSTRAINT IF EXISTS "incidents_relatedViolationId_fkey";
ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_relatedViolationId_fkey"
  FOREIGN KEY ("relatedViolationId") REFERENCES "vehicle_violations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Expand incident_attachments
ALTER TABLE "incident_attachments"
  ADD COLUMN IF NOT EXISTS "originalFileName" TEXT,
  ADD COLUMN IF NOT EXISTS "storagePath" TEXT,
  ADD COLUMN IF NOT EXISTS "thumbnailPath" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "uploadedById" UUID;

CREATE INDEX IF NOT EXISTS "incident_attachments_uploadedById_idx" ON "incident_attachments"("uploadedById");

ALTER TABLE "incident_attachments"
  DROP CONSTRAINT IF EXISTS "incident_attachments_uploadedById_fkey";
ALTER TABLE "incident_attachments"
  ADD CONSTRAINT "incident_attachments_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- incident_assignments
CREATE TABLE IF NOT EXISTS "incident_assignments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "incidentId" UUID NOT NULL,
  "assignedUserId" UUID,
  "assignedGroupId" UUID,
  "assignedRole" TEXT,
  "assignedById" UUID NOT NULL,
  "assignmentType" "IncidentAssignmentType" NOT NULL DEFAULT 'PRIMARY',
  "reason" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "incident_assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "incident_assignments_incidentId_idx" ON "incident_assignments"("incidentId");
CREATE INDEX IF NOT EXISTS "incident_assignments_assignedUserId_idx" ON "incident_assignments"("assignedUserId");
CREATE INDEX IF NOT EXISTS "incident_assignments_assignedGroupId_idx" ON "incident_assignments"("assignedGroupId");
CREATE INDEX IF NOT EXISTS "incident_assignments_assignedAt_idx" ON "incident_assignments"("assignedAt");

ALTER TABLE "incident_assignments"
  DROP CONSTRAINT IF EXISTS "incident_assignments_incidentId_fkey";
ALTER TABLE "incident_assignments"
  ADD CONSTRAINT "incident_assignments_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "incident_assignments"
  DROP CONSTRAINT IF EXISTS "incident_assignments_assignedUserId_fkey";
ALTER TABLE "incident_assignments"
  ADD CONSTRAINT "incident_assignments_assignedUserId_fkey"
  FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incident_assignments"
  DROP CONSTRAINT IF EXISTS "incident_assignments_assignedGroupId_fkey";
ALTER TABLE "incident_assignments"
  ADD CONSTRAINT "incident_assignments_assignedGroupId_fkey"
  FOREIGN KEY ("assignedGroupId") REFERENCES "shift_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incident_assignments"
  DROP CONSTRAINT IF EXISTS "incident_assignments_assignedById_fkey";
ALTER TABLE "incident_assignments"
  ADD CONSTRAINT "incident_assignments_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- incident_notes
CREATE TABLE IF NOT EXISTS "incident_notes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "incidentId" UUID NOT NULL,
  "noteType" "IncidentNoteType" NOT NULL DEFAULT 'GENERAL',
  "content" TEXT NOT NULL,
  "visibility" "IncidentNoteVisibility" NOT NULL DEFAULT 'ALL_AUTHORIZED',
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "incident_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "incident_notes_incidentId_idx" ON "incident_notes"("incidentId");
CREATE INDEX IF NOT EXISTS "incident_notes_createdById_idx" ON "incident_notes"("createdById");
CREATE INDEX IF NOT EXISTS "incident_notes_visibility_idx" ON "incident_notes"("visibility");
CREATE INDEX IF NOT EXISTS "incident_notes_deletedAt_idx" ON "incident_notes"("deletedAt");

ALTER TABLE "incident_notes"
  DROP CONSTRAINT IF EXISTS "incident_notes_incidentId_fkey";
ALTER TABLE "incident_notes"
  ADD CONSTRAINT "incident_notes_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "incident_notes"
  DROP CONSTRAINT IF EXISTS "incident_notes_createdById_fkey";
ALTER TABLE "incident_notes"
  ADD CONSTRAINT "incident_notes_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- incident_contact_logs
CREATE TABLE IF NOT EXISTS "incident_contact_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "incidentId" UUID NOT NULL,
  "contactType" "IncidentContactType" NOT NULL,
  "organizationName" TEXT,
  "contactPerson" TEXT,
  "phoneNumberMasked" TEXT,
  "contactedById" UUID NOT NULL,
  "contactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "result" TEXT NOT NULL,
  "referenceNumber" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "incident_contact_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "incident_contact_logs_incidentId_idx" ON "incident_contact_logs"("incidentId");
CREATE INDEX IF NOT EXISTS "incident_contact_logs_contactedById_idx" ON "incident_contact_logs"("contactedById");
CREATE INDEX IF NOT EXISTS "incident_contact_logs_contactedAt_idx" ON "incident_contact_logs"("contactedAt");

ALTER TABLE "incident_contact_logs"
  DROP CONSTRAINT IF EXISTS "incident_contact_logs_incidentId_fkey";
ALTER TABLE "incident_contact_logs"
  ADD CONSTRAINT "incident_contact_logs_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "incident_contact_logs"
  DROP CONSTRAINT IF EXISTS "incident_contact_logs_contactedById_fkey";
ALTER TABLE "incident_contact_logs"
  ADD CONSTRAINT "incident_contact_logs_contactedById_fkey"
  FOREIGN KEY ("contactedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- incident_tasks
CREATE TABLE IF NOT EXISTS "incident_tasks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "incidentId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "assignedUserId" UUID,
  "assignedGroupId" UUID,
  "priority" "IncidentSeverity" NOT NULL DEFAULT 'MEDIUM',
  "status" "IncidentTaskStatus" NOT NULL DEFAULT 'PENDING',
  "dueAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "completedById" UUID,
  "completionNotes" TEXT,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "incident_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "incident_tasks_incidentId_idx" ON "incident_tasks"("incidentId");
CREATE INDEX IF NOT EXISTS "incident_tasks_assignedUserId_idx" ON "incident_tasks"("assignedUserId");
CREATE INDEX IF NOT EXISTS "incident_tasks_status_idx" ON "incident_tasks"("status");
CREATE INDEX IF NOT EXISTS "incident_tasks_dueAt_idx" ON "incident_tasks"("dueAt");
CREATE INDEX IF NOT EXISTS "incident_tasks_deletedAt_idx" ON "incident_tasks"("deletedAt");

ALTER TABLE "incident_tasks"
  DROP CONSTRAINT IF EXISTS "incident_tasks_incidentId_fkey";
ALTER TABLE "incident_tasks"
  ADD CONSTRAINT "incident_tasks_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "incident_tasks"
  DROP CONSTRAINT IF EXISTS "incident_tasks_assignedUserId_fkey";
ALTER TABLE "incident_tasks"
  ADD CONSTRAINT "incident_tasks_assignedUserId_fkey"
  FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incident_tasks"
  DROP CONSTRAINT IF EXISTS "incident_tasks_assignedGroupId_fkey";
ALTER TABLE "incident_tasks"
  ADD CONSTRAINT "incident_tasks_assignedGroupId_fkey"
  FOREIGN KEY ("assignedGroupId") REFERENCES "shift_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incident_tasks"
  DROP CONSTRAINT IF EXISTS "incident_tasks_completedById_fkey";
ALTER TABLE "incident_tasks"
  ADD CONSTRAINT "incident_tasks_completedById_fkey"
  FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incident_tasks"
  DROP CONSTRAINT IF EXISTS "incident_tasks_createdById_fkey";
ALTER TABLE "incident_tasks"
  ADD CONSTRAINT "incident_tasks_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- emergency_procedures
CREATE TABLE IF NOT EXISTS "emergency_procedures" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "incidentTypeCode" TEXT NOT NULL,
  "severity" "IncidentSeverity",
  "description" TEXT NOT NULL,
  "instructionsJson" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "emergency_procedures_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "emergency_procedures_code_key" ON "emergency_procedures"("code");
CREATE INDEX IF NOT EXISTS "emergency_procedures_incidentTypeCode_idx" ON "emergency_procedures"("incidentTypeCode");
CREATE INDEX IF NOT EXISTS "emergency_procedures_isActive_idx" ON "emergency_procedures"("isActive");
CREATE INDEX IF NOT EXISTS "emergency_procedures_deletedAt_idx" ON "emergency_procedures"("deletedAt");

ALTER TABLE "emergency_procedures"
  DROP CONSTRAINT IF EXISTS "emergency_procedures_createdById_fkey";
ALTER TABLE "emergency_procedures"
  ADD CONSTRAINT "emergency_procedures_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- incident_procedure_steps
CREATE TABLE IF NOT EXISTS "incident_procedure_steps" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "incidentId" UUID NOT NULL,
  "procedureId" UUID NOT NULL,
  "stepIndex" INTEGER NOT NULL,
  "stepTitle" TEXT NOT NULL,
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "completedById" UUID,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "incident_procedure_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "incident_procedure_steps_incidentId_procedureId_stepIndex_key"
  ON "incident_procedure_steps"("incidentId", "procedureId", "stepIndex");
CREATE INDEX IF NOT EXISTS "incident_procedure_steps_incidentId_idx" ON "incident_procedure_steps"("incidentId");
CREATE INDEX IF NOT EXISTS "incident_procedure_steps_procedureId_idx" ON "incident_procedure_steps"("procedureId");

ALTER TABLE "incident_procedure_steps"
  DROP CONSTRAINT IF EXISTS "incident_procedure_steps_incidentId_fkey";
ALTER TABLE "incident_procedure_steps"
  ADD CONSTRAINT "incident_procedure_steps_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "incident_procedure_steps"
  DROP CONSTRAINT IF EXISTS "incident_procedure_steps_procedureId_fkey";
ALTER TABLE "incident_procedure_steps"
  ADD CONSTRAINT "incident_procedure_steps_procedureId_fkey"
  FOREIGN KEY ("procedureId") REFERENCES "emergency_procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "incident_procedure_steps"
  DROP CONSTRAINT IF EXISTS "incident_procedure_steps_completedById_fkey";
ALTER TABLE "incident_procedure_steps"
  ADD CONSTRAINT "incident_procedure_steps_completedById_fkey"
  FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- incident_follow_ups
CREATE TABLE IF NOT EXISTS "incident_follow_ups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "incidentId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "assignedToId" UUID,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "status" "IncidentFollowUpStatus" NOT NULL DEFAULT 'OPEN',
  "result" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "incident_follow_ups_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "incident_follow_ups_incidentId_idx" ON "incident_follow_ups"("incidentId");
CREATE INDEX IF NOT EXISTS "incident_follow_ups_assignedToId_idx" ON "incident_follow_ups"("assignedToId");
CREATE INDEX IF NOT EXISTS "incident_follow_ups_status_idx" ON "incident_follow_ups"("status");
CREATE INDEX IF NOT EXISTS "incident_follow_ups_dueAt_idx" ON "incident_follow_ups"("dueAt");
CREATE INDEX IF NOT EXISTS "incident_follow_ups_deletedAt_idx" ON "incident_follow_ups"("deletedAt");

ALTER TABLE "incident_follow_ups"
  DROP CONSTRAINT IF EXISTS "incident_follow_ups_incidentId_fkey";
ALTER TABLE "incident_follow_ups"
  ADD CONSTRAINT "incident_follow_ups_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "incident_follow_ups"
  DROP CONSTRAINT IF EXISTS "incident_follow_ups_assignedToId_fkey";
ALTER TABLE "incident_follow_ups"
  ADD CONSTRAINT "incident_follow_ups_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incident_follow_ups"
  DROP CONSTRAINT IF EXISTS "incident_follow_ups_createdById_fkey";
ALTER TABLE "incident_follow_ups"
  ADD CONSTRAINT "incident_follow_ups_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
