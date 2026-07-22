-- Sprint 05: Smart Visitors Management

CREATE TYPE "VisitStatus" AS ENUM ('UPCOMING', 'ARRIVED', 'HOST_NOTIFIED', 'IN_MEETING', 'COMPLETED', 'CANCELLED');
CREATE TYPE "VisitImportance" AS ENUM ('NORMAL', 'IMPORTANT', 'VIP');
CREATE TYPE "HostCommunicationPreference" AS ENUM ('WHATSAPP', 'PHONE_CALL', 'BOTH');
CREATE TYPE "VisitHistoryAction" AS ENUM ('CREATED', 'UPDATED', 'ARRIVED', 'HOST_NOTIFIED', 'IN_MEETING', 'COMPLETED', 'CANCELLED', 'EMAIL_IMPORTED', 'STATUS_CHANGED');
CREATE TYPE "VisitEmailParseStatus" AS ENUM ('PENDING', 'PROCESSED', 'REJECTED');
CREATE TYPE "VisitNotificationChannel" AS ENUM ('REALTIME', 'WHATSAPP', 'PHONE_CALL', 'EMAIL');
CREATE TYPE "VisitNotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- Meeting rooms
CREATE TABLE IF NOT EXISTS "meeting_rooms" (
  "id" UUID NOT NULL,
  "floorId" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "capacity" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "meeting_rooms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "meeting_rooms_floorId_code_key" ON "meeting_rooms"("floorId", "code");
CREATE INDEX IF NOT EXISTS "meeting_rooms_floorId_idx" ON "meeting_rooms"("floorId");
CREATE INDEX IF NOT EXISTS "meeting_rooms_deletedAt_idx" ON "meeting_rooms"("deletedAt");

DO $$ BEGIN
  ALTER TABLE "meeting_rooms"
    ADD CONSTRAINT "meeting_rooms_floorId_fkey"
    FOREIGN KEY ("floorId") REFERENCES "floors"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Rebuild hosts table columns
ALTER TABLE "hosts"
  ADD COLUMN IF NOT EXISTS "employeeNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "employeeName" TEXT,
  ADD COLUMN IF NOT EXISTS "departmentId" UUID,
  ADD COLUMN IF NOT EXISTS "communicationPreference" "HostCommunicationPreference" NOT NULL DEFAULT 'WHATSAPP',
  ADD COLUMN IF NOT EXISTS "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "phoneCallEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Migrate legacy fullName → employeeName
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hosts' AND column_name = 'fullName'
  ) THEN
    EXECUTE 'UPDATE "hosts" SET "employeeName" = COALESCE("employeeName", "fullName")';
    EXECUTE 'ALTER TABLE "hosts" DROP COLUMN "fullName"';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hosts' AND column_name = 'organization'
  ) THEN
    EXECUTE 'ALTER TABLE "hosts" DROP COLUMN "organization"';
  END IF;
END $$;

UPDATE "hosts"
SET "employeeNumber" = COALESCE("employeeNumber", 'HOST-' || substr(replace(id::text, '-', ''), 1, 8))
WHERE "employeeNumber" IS NULL;

UPDATE "hosts"
SET "employeeName" = COALESCE("employeeName", 'Unknown Host')
WHERE "employeeName" IS NULL;

ALTER TABLE "hosts" ALTER COLUMN "employeeNumber" SET NOT NULL;
ALTER TABLE "hosts" ALTER COLUMN "employeeName" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "hosts_employeeNumber_key" ON "hosts"("employeeNumber");
CREATE INDEX IF NOT EXISTS "hosts_departmentId_idx" ON "hosts"("departmentId");
CREATE INDEX IF NOT EXISTS "hosts_employeeNumber_idx" ON "hosts"("employeeNumber");

DO $$ BEGIN
  ALTER TABLE "hosts"
    ADD CONSTRAINT "hosts_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "departments"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Rebuild visitors columns
ALTER TABLE "visitors"
  ADD COLUMN IF NOT EXISTS "visitorName" TEXT,
  ADD COLUMN IF NOT EXISTS "organization" TEXT,
  ADD COLUMN IF NOT EXISTS "mobile" TEXT,
  ADD COLUMN IF NOT EXISTS "vehiclePlate" TEXT,
  ADD COLUMN IF NOT EXISTS "visitDate" DATE,
  ADD COLUMN IF NOT EXISTS "arrivalTime" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "departureTime" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "importance" "VisitImportance" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "status" "VisitStatus" NOT NULL DEFAULT 'UPCOMING',
  ADD COLUMN IF NOT EXISTS "floorId" UUID,
  ADD COLUMN IF NOT EXISTS "meetingRoomId" UUID,
  ADD COLUMN IF NOT EXISTS "hostNotifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "hostRespondedAt" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visitors' AND column_name = 'fullName'
  ) THEN
    EXECUTE 'UPDATE "visitors" SET "visitorName" = COALESCE("visitorName", "fullName")';
    EXECUTE 'ALTER TABLE "visitors" DROP COLUMN "fullName"';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visitors' AND column_name = 'company'
  ) THEN
    EXECUTE 'UPDATE "visitors" SET "organization" = COALESCE("organization", "company")';
    EXECUTE 'ALTER TABLE "visitors" DROP COLUMN "company"';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visitors' AND column_name = 'phone'
  ) THEN
    EXECUTE 'UPDATE "visitors" SET "mobile" = COALESCE("mobile", "phone")';
    EXECUTE 'ALTER TABLE "visitors" DROP COLUMN "phone"';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visitors' AND column_name = 'checkInAt'
  ) THEN
    EXECUTE 'UPDATE "visitors" SET "arrivalTime" = COALESCE("arrivalTime", "checkInAt")';
    EXECUTE 'ALTER TABLE "visitors" DROP COLUMN "checkInAt"';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visitors' AND column_name = 'checkOutAt'
  ) THEN
    EXECUTE 'UPDATE "visitors" SET "departureTime" = COALESCE("departureTime", "checkOutAt")';
    EXECUTE 'ALTER TABLE "visitors" DROP COLUMN "checkOutAt"';
  END IF;
END $$;

UPDATE "visitors"
SET "visitorName" = COALESCE("visitorName", 'Unknown Visitor')
WHERE "visitorName" IS NULL;

UPDATE "visitors"
SET "visitDate" = COALESCE("visitDate", DATE("createdAt"))
WHERE "visitDate" IS NULL;

ALTER TABLE "visitors" ALTER COLUMN "visitorName" SET NOT NULL;
ALTER TABLE "visitors" ALTER COLUMN "visitDate" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "visitors_floorId_idx" ON "visitors"("floorId");
CREATE INDEX IF NOT EXISTS "visitors_meetingRoomId_idx" ON "visitors"("meetingRoomId");
CREATE INDEX IF NOT EXISTS "visitors_visitDate_idx" ON "visitors"("visitDate");
CREATE INDEX IF NOT EXISTS "visitors_status_idx" ON "visitors"("status");
CREATE INDEX IF NOT EXISTS "visitors_importance_idx" ON "visitors"("importance");
CREATE INDEX IF NOT EXISTS "visitors_arrivalTime_idx" ON "visitors"("arrivalTime");

DO $$ BEGIN
  ALTER TABLE "visitors"
    ADD CONSTRAINT "visitors_floorId_fkey"
    FOREIGN KEY ("floorId") REFERENCES "floors"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "visitors"
    ADD CONSTRAINT "visitors_meetingRoomId_fkey"
    FOREIGN KEY ("meetingRoomId") REFERENCES "meeting_rooms"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Visit history
CREATE TABLE IF NOT EXISTS "visit_history" (
  "id" UUID NOT NULL,
  "visitorId" UUID NOT NULL,
  "action" "VisitHistoryAction" NOT NULL,
  "actorId" UUID,
  "fromStatus" "VisitStatus",
  "toStatus" "VisitStatus",
  "notes" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "visit_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "visit_history_visitorId_idx" ON "visit_history"("visitorId");
CREATE INDEX IF NOT EXISTS "visit_history_actorId_idx" ON "visit_history"("actorId");
CREATE INDEX IF NOT EXISTS "visit_history_action_idx" ON "visit_history"("action");
CREATE INDEX IF NOT EXISTS "visit_history_createdAt_idx" ON "visit_history"("createdAt");

DO $$ BEGIN
  ALTER TABLE "visit_history"
    ADD CONSTRAINT "visit_history_visitorId_fkey"
    FOREIGN KEY ("visitorId") REFERENCES "visitors"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "visit_history"
    ADD CONSTRAINT "visit_history_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Visit notifications
CREATE TABLE IF NOT EXISTS "visit_notifications" (
  "id" UUID NOT NULL,
  "visitorId" UUID NOT NULL,
  "userId" UUID,
  "channel" "VisitNotificationChannel" NOT NULL DEFAULT 'REALTIME',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "VisitNotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "visit_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "visit_notifications_visitorId_idx" ON "visit_notifications"("visitorId");
CREATE INDEX IF NOT EXISTS "visit_notifications_userId_idx" ON "visit_notifications"("userId");
CREATE INDEX IF NOT EXISTS "visit_notifications_channel_idx" ON "visit_notifications"("channel");
CREATE INDEX IF NOT EXISTS "visit_notifications_status_idx" ON "visit_notifications"("status");
CREATE INDEX IF NOT EXISTS "visit_notifications_createdAt_idx" ON "visit_notifications"("createdAt");

DO $$ BEGIN
  ALTER TABLE "visit_notifications"
    ADD CONSTRAINT "visit_notifications_visitorId_fkey"
    FOREIGN KEY ("visitorId") REFERENCES "visitors"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "visit_notifications"
    ADD CONSTRAINT "visit_notifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Visit email ingest (mail parser prep)
CREATE TABLE IF NOT EXISTS "visit_email_ingests" (
  "id" UUID NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL,
  "senderDomain" TEXT NOT NULL,
  "senderEmail" TEXT,
  "visitorId" UUID,
  "parseStatus" "VisitEmailParseStatus" NOT NULL DEFAULT 'PENDING',
  "rawHeaders" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "visit_email_ingests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "visit_email_ingests_senderDomain_idx" ON "visit_email_ingests"("senderDomain");
CREATE INDEX IF NOT EXISTS "visit_email_ingests_receivedAt_idx" ON "visit_email_ingests"("receivedAt");
CREATE INDEX IF NOT EXISTS "visit_email_ingests_parseStatus_idx" ON "visit_email_ingests"("parseStatus");
CREATE INDEX IF NOT EXISTS "visit_email_ingests_visitorId_idx" ON "visit_email_ingests"("visitorId");

DO $$ BEGIN
  ALTER TABLE "visit_email_ingests"
    ADD CONSTRAINT "visit_email_ingests_visitorId_fkey"
    FOREIGN KEY ("visitorId") REFERENCES "visitors"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
