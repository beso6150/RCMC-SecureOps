-- Sprint 09: Incidents module enhancements

-- New enum: incident history actions
CREATE TYPE "IncidentHistoryAction" AS ENUM (
  'CREATED',
  'UPDATED',
  'ASSIGNED',
  'STATUS_CHANGED',
  'COMMENTED',
  'ATTACHMENT_ADDED',
  'CLOSED',
  'CANCELLED',
  'PDF_GENERATED'
);

-- Recreate IncidentStatus with new values
CREATE TYPE "IncidentStatus_new" AS ENUM (
  'NEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'ON_HOLD',
  'CLOSED',
  'CANCELLED'
);

ALTER TABLE "incidents" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "incidents"
  ALTER COLUMN "status" TYPE "IncidentStatus_new"
  USING (
    CASE "status"::text
      WHEN 'OPEN' THEN 'NEW'
      WHEN 'ACKNOWLEDGED' THEN 'ASSIGNED'
      WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'
      WHEN 'RESOLVED' THEN 'CLOSED'
      WHEN 'CLOSED' THEN 'CLOSED'
      WHEN 'ESCALATED' THEN 'IN_PROGRESS'
      WHEN 'NEW' THEN 'NEW'
      WHEN 'ASSIGNED' THEN 'ASSIGNED'
      WHEN 'ON_HOLD' THEN 'ON_HOLD'
      WHEN 'CANCELLED' THEN 'CANCELLED'
      ELSE 'NEW'
    END::"IncidentStatus_new"
  );

DROP TYPE "IncidentStatus";
ALTER TYPE "IncidentStatus_new" RENAME TO "IncidentStatus";

ALTER TABLE "incidents" ALTER COLUMN "status" SET DEFAULT 'NEW'::"IncidentStatus";

-- Incident types lookup table
CREATE TABLE "incident_types" (
  "id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "incident_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "incident_types_code_key" ON "incident_types"("code");
CREATE INDEX "incident_types_isActive_idx" ON "incident_types"("isActive");
CREATE INDEX "incident_types_deletedAt_idx" ON "incident_types"("deletedAt");

-- Seed default OTHER type for legacy rows
INSERT INTO "incident_types" (
  "id",
  "code",
  "nameAr",
  "nameEn",
  "description",
  "isActive",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
VALUES (
  gen_random_uuid(),
  'OTHER',
  'أخرى',
  'Other',
  'Default type for migrated incidents',
  true,
  90,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Expand incidents table
ALTER TABLE "incidents"
  ADD COLUMN IF NOT EXISTS "typeId" UUID,
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "parkingCode" "ParkingLocationCode",
  ADD COLUMN IF NOT EXISTS "floorId" UUID,
  ADD COLUMN IF NOT EXISTS "meetingRoomId" UUID,
  ADD COLUMN IF NOT EXISTS "shiftId" UUID,
  ADD COLUMN IF NOT EXISTS "supervisorId" UUID,
  ADD COLUMN IF NOT EXISTS "opsManagerId" UUID,
  ADD COLUMN IF NOT EXISTS "gpsLatitude" DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS "gpsLongitude" DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "slaDueAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "durationMs" INTEGER,
  ADD COLUMN IF NOT EXISTS "pdfPath" TEXT,
  ADD COLUMN IF NOT EXISTS "clientSyncId" TEXT;

UPDATE "incidents"
SET "typeId" = (SELECT "id" FROM "incident_types" WHERE "code" = 'OTHER' LIMIT 1)
WHERE "typeId" IS NULL;

ALTER TABLE "incidents" ALTER COLUMN "typeId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "incidents_clientSyncId_key" ON "incidents"("clientSyncId");
CREATE INDEX IF NOT EXISTS "incidents_typeId_idx" ON "incidents"("typeId");
CREATE INDEX IF NOT EXISTS "incidents_floorId_idx" ON "incidents"("floorId");
CREATE INDEX IF NOT EXISTS "incidents_meetingRoomId_idx" ON "incidents"("meetingRoomId");

ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_typeId_fkey"
    FOREIGN KEY ("typeId") REFERENCES "incident_types"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_floorId_fkey"
    FOREIGN KEY ("floorId") REFERENCES "floors"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_meetingRoomId_fkey"
    FOREIGN KEY ("meetingRoomId") REFERENCES "meeting_rooms"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_shiftId_fkey"
    FOREIGN KEY ("shiftId") REFERENCES "shifts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_supervisorId_fkey"
    FOREIGN KEY ("supervisorId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "incidents"
  ADD CONSTRAINT "incidents_opsManagerId_fkey"
    FOREIGN KEY ("opsManagerId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Incident comments
CREATE TABLE "incident_comments" (
  "id" UUID NOT NULL,
  "incidentId" UUID NOT NULL,
  "authorId" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "incident_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "incident_comments_incidentId_idx" ON "incident_comments"("incidentId");
CREATE INDEX "incident_comments_authorId_idx" ON "incident_comments"("authorId");
CREATE INDEX "incident_comments_createdAt_idx" ON "incident_comments"("createdAt");

ALTER TABLE "incident_comments"
  ADD CONSTRAINT "incident_comments_incidentId_fkey"
    FOREIGN KEY ("incidentId") REFERENCES "incidents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "incident_comments"
  ADD CONSTRAINT "incident_comments_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Incident history audit trail
CREATE TABLE "incident_history" (
  "id" UUID NOT NULL,
  "incidentId" UUID NOT NULL,
  "action" "IncidentHistoryAction" NOT NULL,
  "actorId" UUID,
  "fromStatus" "IncidentStatus",
  "toStatus" "IncidentStatus",
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "incident_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "incident_history_incidentId_idx" ON "incident_history"("incidentId");
CREATE INDEX "incident_history_actorId_idx" ON "incident_history"("actorId");
CREATE INDEX "incident_history_action_idx" ON "incident_history"("action");
CREATE INDEX "incident_history_createdAt_idx" ON "incident_history"("createdAt");

ALTER TABLE "incident_history"
  ADD CONSTRAINT "incident_history_incidentId_fkey"
    FOREIGN KEY ("incidentId") REFERENCES "incidents"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "incident_history"
  ADD CONSTRAINT "incident_history_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Attachment local path for offline sync
ALTER TABLE "incident_attachments"
  ADD COLUMN IF NOT EXISTS "localPath" TEXT;
