-- Sprint 18: Security Reports, Audit Log extensions & KPIs

-- Expand existing AuditAction enum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DOWNLOAD';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PRINT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'VIEW_SENSITIVE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACCESS_DENIED';

-- New enums
CREATE TYPE "AuditSeverity" AS ENUM ('INFO', 'WARNING', 'HIGH', 'CRITICAL');

CREATE TYPE "SavedReportType" AS ENUM (
  'DAILY_SECURITY',
  'SHIFT_REPORT',
  'HANDOVER_REPORT',
  'INCIDENT_REPORT',
  'EMERGENCY_REPORT',
  'PATROL_REPORT',
  'CHECKPOINT_REPORT',
  'CCTV_REFERRAL_REPORT',
  'PERMIT_REPORT',
  'VISITOR_REPORT',
  'VEHICLE_VIOLATION_REPORT',
  'RESPONSE_TIME_REPORT',
  'PERSONNEL_PERFORMANCE',
  'GROUP_PERFORMANCE',
  'SHIFT_PERFORMANCE',
  'LOCATION_ANALYSIS',
  'AUDIT_REPORT',
  'CUSTOM'
);

CREATE TYPE "SavedReportStatus" AS ENUM (
  'DRAFT',
  'GENERATED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'ARCHIVED',
  'FAILED'
);

CREATE TYPE "ReportClassification" AS ENUM (
  'INTERNAL',
  'CONFIDENTIAL',
  'HIGHLY_CONFIDENTIAL'
);

CREATE TYPE "ReportSectionType" AS ENUM (
  'SUMMARY',
  'KPI',
  'TABLE',
  'CHART',
  'TEXT',
  'TIMELINE',
  'RECOMMENDATIONS',
  'SIGNATURES',
  'ATTACHMENTS_LIST'
);

CREATE TYPE "ReportApprovalAction" AS ENUM (
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'RETURNED_FOR_EDIT',
  'ARCHIVED'
);

CREATE TYPE "ReportScheduleFrequency" AS ENUM (
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'END_OF_SHIFT'
);

CREATE TYPE "ReportAccessAction" AS ENUM (
  'VIEW',
  'GENERATE',
  'DOWNLOAD_PDF',
  'DOWNLOAD_CSV',
  'PRINT',
  'SUBMIT_FOR_APPROVAL',
  'APPROVE',
  'REJECT',
  'ARCHIVE'
);

-- Extend audit_logs
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "module" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "oldValues" JSONB;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "newValues" JSONB;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "requestId" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "severity" "AuditSeverity" NOT NULL DEFAULT 'INFO';
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "success" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "failureReason" TEXT;

CREATE INDEX IF NOT EXISTS "audit_logs_module_idx" ON "audit_logs"("module");
CREATE INDEX IF NOT EXISTS "audit_logs_severity_idx" ON "audit_logs"("severity");
CREATE INDEX IF NOT EXISTS "audit_logs_success_idx" ON "audit_logs"("success");
CREATE INDEX IF NOT EXISTS "audit_logs_requestId_idx" ON "audit_logs"("requestId");

-- saved_reports
CREATE TABLE IF NOT EXISTS "saved_reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reportNumber" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "reportType" "SavedReportType" NOT NULL,
  "status" "SavedReportStatus" NOT NULL DEFAULT 'DRAFT',
  "dateFrom" TIMESTAMP(3) NOT NULL,
  "dateTo" TIMESTAMP(3) NOT NULL,
  "shiftType" TEXT,
  "groupId" UUID,
  "zoneId" UUID,
  "userId" UUID,
  "filtersJson" JSONB,
  "summaryJson" JSONB,
  "notes" TEXT,
  "recommendations" TEXT,
  "generatedById" UUID NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedById" UUID,
  "approvedAt" TIMESTAMP(3),
  "approvalNotes" TEXT,
  "classification" "ReportClassification" NOT NULL DEFAULT 'INTERNAL',
  "version" INTEGER NOT NULL DEFAULT 1,
  "parentReportId" UUID,
  "filePath" TEXT,
  "fileMimeType" TEXT,
  "fileSize" INTEGER,
  "checksumSha256" TEXT,
  "csvPath" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "saved_reports_reportNumber_version_key" ON "saved_reports"("reportNumber", "version");
CREATE INDEX IF NOT EXISTS "saved_reports_reportType_idx" ON "saved_reports"("reportType");
CREATE INDEX IF NOT EXISTS "saved_reports_status_idx" ON "saved_reports"("status");
CREATE INDEX IF NOT EXISTS "saved_reports_generatedById_idx" ON "saved_reports"("generatedById");
CREATE INDEX IF NOT EXISTS "saved_reports_approvedById_idx" ON "saved_reports"("approvedById");
CREATE INDEX IF NOT EXISTS "saved_reports_dateFrom_dateTo_idx" ON "saved_reports"("dateFrom", "dateTo");
CREATE INDEX IF NOT EXISTS "saved_reports_classification_idx" ON "saved_reports"("classification");
CREATE INDEX IF NOT EXISTS "saved_reports_deletedAt_idx" ON "saved_reports"("deletedAt");

ALTER TABLE "saved_reports"
  DROP CONSTRAINT IF EXISTS "saved_reports_generatedById_fkey",
  ADD CONSTRAINT "saved_reports_generatedById_fkey"
    FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "saved_reports"
  DROP CONSTRAINT IF EXISTS "saved_reports_approvedById_fkey",
  ADD CONSTRAINT "saved_reports_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "saved_reports"
  DROP CONSTRAINT IF EXISTS "saved_reports_groupId_fkey",
  ADD CONSTRAINT "saved_reports_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "shift_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "saved_reports"
  DROP CONSTRAINT IF EXISTS "saved_reports_zoneId_fkey",
  ADD CONSTRAINT "saved_reports_zoneId_fkey"
    FOREIGN KEY ("zoneId") REFERENCES "security_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "saved_reports"
  DROP CONSTRAINT IF EXISTS "saved_reports_userId_fkey",
  ADD CONSTRAINT "saved_reports_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "saved_reports"
  DROP CONSTRAINT IF EXISTS "saved_reports_parentReportId_fkey",
  ADD CONSTRAINT "saved_reports_parentReportId_fkey"
    FOREIGN KEY ("parentReportId") REFERENCES "saved_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- report_sections
CREATE TABLE IF NOT EXISTS "report_sections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reportId" UUID NOT NULL,
  "sectionKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sectionType" "ReportSectionType" NOT NULL,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "contentJson" JSONB,
  "textContent" TEXT,
  "isVisible" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "report_sections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "report_sections_reportId_orderIndex_idx" ON "report_sections"("reportId", "orderIndex");

ALTER TABLE "report_sections"
  DROP CONSTRAINT IF EXISTS "report_sections_reportId_fkey",
  ADD CONSTRAINT "report_sections_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "saved_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- report_approvals
CREATE TABLE IF NOT EXISTS "report_approvals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reportId" UUID NOT NULL,
  "approverId" UUID NOT NULL,
  "action" "ReportApprovalAction" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_approvals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "report_approvals_reportId_idx" ON "report_approvals"("reportId");
CREATE INDEX IF NOT EXISTS "report_approvals_approverId_idx" ON "report_approvals"("approverId");
CREATE INDEX IF NOT EXISTS "report_approvals_createdAt_idx" ON "report_approvals"("createdAt");

ALTER TABLE "report_approvals"
  DROP CONSTRAINT IF EXISTS "report_approvals_reportId_fkey",
  ADD CONSTRAINT "report_approvals_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "saved_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "report_approvals"
  DROP CONSTRAINT IF EXISTS "report_approvals_approverId_fkey",
  ADD CONSTRAINT "report_approvals_approverId_fkey"
    FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- report_schedules
CREATE TABLE IF NOT EXISTS "report_schedules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "reportType" "SavedReportType" NOT NULL,
  "frequency" "ReportScheduleFrequency" NOT NULL,
  "timeOfDay" TEXT NOT NULL,
  "dayOfWeek" INTEGER,
  "dayOfMonth" INTEGER,
  "shiftType" TEXT,
  "groupId" UUID,
  "filtersJson" JSONB,
  "recipientsJson" JSONB,
  "generatePdf" BOOLEAN NOT NULL DEFAULT true,
  "generateCsv" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastRunAt" TIMESTAMP(3),
  "nextRunAt" TIMESTAMP(3),
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "report_schedules_reportType_idx" ON "report_schedules"("reportType");
CREATE INDEX IF NOT EXISTS "report_schedules_isActive_idx" ON "report_schedules"("isActive");
CREATE INDEX IF NOT EXISTS "report_schedules_nextRunAt_idx" ON "report_schedules"("nextRunAt");
CREATE INDEX IF NOT EXISTS "report_schedules_deletedAt_idx" ON "report_schedules"("deletedAt");

ALTER TABLE "report_schedules"
  DROP CONSTRAINT IF EXISTS "report_schedules_createdById_fkey",
  ADD CONSTRAINT "report_schedules_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "report_schedules"
  DROP CONSTRAINT IF EXISTS "report_schedules_groupId_fkey",
  ADD CONSTRAINT "report_schedules_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "shift_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- report_access_logs
CREATE TABLE IF NOT EXISTS "report_access_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "reportId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "action" "ReportAccessAction" NOT NULL,
  "reason" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "report_access_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "report_access_logs_reportId_idx" ON "report_access_logs"("reportId");
CREATE INDEX IF NOT EXISTS "report_access_logs_userId_idx" ON "report_access_logs"("userId");
CREATE INDEX IF NOT EXISTS "report_access_logs_action_idx" ON "report_access_logs"("action");
CREATE INDEX IF NOT EXISTS "report_access_logs_createdAt_idx" ON "report_access_logs"("createdAt");

ALTER TABLE "report_access_logs"
  DROP CONSTRAINT IF EXISTS "report_access_logs_reportId_fkey",
  ADD CONSTRAINT "report_access_logs_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "saved_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "report_access_logs"
  DROP CONSTRAINT IF EXISTS "report_access_logs_userId_fkey",
  ADD CONSTRAINT "report_access_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
