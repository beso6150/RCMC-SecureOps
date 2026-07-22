-- Sprint 12: CCTV Control Room — camera requests

CREATE TYPE "CameraRequestStatus" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
);

CREATE TABLE "camera_requests" (
  "id" UUID NOT NULL,
  "plateNumber" TEXT NOT NULL,
  "notes" TEXT,
  "status" "CameraRequestStatus" NOT NULL DEFAULT 'PENDING',
  "requestedById" UUID NOT NULL,
  "assignedOperatorId" UUID,
  "employeeName" TEXT,
  "departmentName" TEXT,
  "phone" TEXT,
  "permitStatus" TEXT,
  "vehicleType" TEXT,
  "ownerName" TEXT,
  "permitId" UUID,
  "responseNotes" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "responseTimeMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "camera_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "camera_requests_status_idx" ON "camera_requests"("status");
CREATE INDEX "camera_requests_plateNumber_idx" ON "camera_requests"("plateNumber");
CREATE INDEX "camera_requests_requestedById_idx" ON "camera_requests"("requestedById");
CREATE INDEX "camera_requests_assignedOperatorId_idx" ON "camera_requests"("assignedOperatorId");
CREATE INDEX "camera_requests_deletedAt_idx" ON "camera_requests"("deletedAt");

ALTER TABLE "camera_requests"
  ADD CONSTRAINT "camera_requests_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "camera_requests"
  ADD CONSTRAINT "camera_requests_assignedOperatorId_fkey"
  FOREIGN KEY ("assignedOperatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "camera_requests"
  ADD CONSTRAINT "camera_requests_permitId_fkey"
  FOREIGN KEY ("permitId") REFERENCES "vehicle_permits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
