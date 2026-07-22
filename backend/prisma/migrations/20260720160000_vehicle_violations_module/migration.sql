-- Sprint 04: Vehicle Violations module enhancements

-- New enums
CREATE TYPE "ViolationType" AS ENUM (
  'ILLEGAL_PARKING',
  'NO_PERMIT',
  'EXPIRED_PERMIT',
  'BLOCKING',
  'UNAUTHORIZED_ZONE',
  'OTHER'
);

CREATE TYPE "ParkingLocationCode" AS ENUM (
  'GROUND_PARKING',
  'BASEMENT_PARKING',
  'WEST_PARKING'
);

-- Recreate VehicleViolationStatus with new values
CREATE TYPE "VehicleViolationStatus_new" AS ENUM (
  'NEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'CANCELLED'
);

-- Add new columns (nullable first for existing rows)
ALTER TABLE "vehicle_violations"
  ADD COLUMN IF NOT EXISTS "arabicPlate" TEXT,
  ADD COLUMN IF NOT EXISTS "englishPlate" TEXT,
  ADD COLUMN IF NOT EXISTS "vehicleColor" TEXT,
  ADD COLUMN IF NOT EXISTS "violationType" "ViolationType",
  ADD COLUMN IF NOT EXISTS "parkingCode" "ParkingLocationCode",
  ADD COLUMN IF NOT EXISTS "imagePath" TEXT,
  ADD COLUMN IF NOT EXISTS "createdById" UUID,
  ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "clientSyncId" TEXT;

-- Migrate imageUrl -> imagePath if legacy column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicle_violations' AND column_name = 'imageUrl'
  ) THEN
    EXECUTE 'UPDATE "vehicle_violations" SET "imagePath" = COALESCE("imagePath", "imageUrl")';
    EXECUTE 'ALTER TABLE "vehicle_violations" DROP COLUMN "imageUrl"';
  END IF;
END $$;

-- Map legacy statuses then switch enum
ALTER TABLE "vehicle_violations" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "vehicle_violations"
  ALTER COLUMN "status" TYPE "VehicleViolationStatus_new"
  USING (
    CASE "status"::text
      WHEN 'OPEN' THEN 'NEW'
      WHEN 'UNDER_REVIEW' THEN 'ASSIGNED'
      WHEN 'ASSIGNED' THEN 'ASSIGNED'
      WHEN 'RESOLVED' THEN 'RESOLVED'
      WHEN 'DISMISSED' THEN 'CANCELLED'
      WHEN 'ESCALATED' THEN 'IN_PROGRESS'
      WHEN 'NEW' THEN 'NEW'
      WHEN 'IN_PROGRESS' THEN 'IN_PROGRESS'
      WHEN 'CANCELLED' THEN 'CANCELLED'
      ELSE 'NEW'
    END::"VehicleViolationStatus_new"
  );

DROP TYPE "VehicleViolationStatus";
ALTER TYPE "VehicleViolationStatus_new" RENAME TO "VehicleViolationStatus";

ALTER TABLE "vehicle_violations" ALTER COLUMN "status" SET DEFAULT 'NEW'::"VehicleViolationStatus";

-- Defaults for new required fields on any leftover rows
UPDATE "vehicle_violations"
SET "violationType" = 'OTHER'::"ViolationType"
WHERE "violationType" IS NULL;

UPDATE "vehicle_violations"
SET "parkingCode" = 'GROUND_PARKING'::"ParkingLocationCode"
WHERE "parkingCode" IS NULL;

-- createdById: backfill from supervisor/cctv/first user if needed
DO $$
DECLARE
  fallback_user UUID;
BEGIN
  SELECT id INTO fallback_user FROM "users" WHERE "deletedAt" IS NULL LIMIT 1;
  IF fallback_user IS NOT NULL THEN
    UPDATE "vehicle_violations"
    SET "createdById" = COALESCE("createdById", "supervisorId", "cctvOperatorId", fallback_user)
    WHERE "createdById" IS NULL;
  END IF;
END $$;

-- locationId must be non-null going forward (only alter if column exists)
ALTER TABLE "vehicle_violations" ALTER COLUMN "locationId" SET NOT NULL;
ALTER TABLE "vehicle_violations" ALTER COLUMN "violationType" SET NOT NULL;
ALTER TABLE "vehicle_violations" ALTER COLUMN "parkingCode" SET NOT NULL;
ALTER TABLE "vehicle_violations" ALTER COLUMN "createdById" SET NOT NULL;

-- Unique client sync id
CREATE UNIQUE INDEX IF NOT EXISTS "vehicle_violations_clientSyncId_key"
  ON "vehicle_violations"("clientSyncId");

-- FKs / indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vehicle_violations_createdById_fkey'
  ) THEN
    ALTER TABLE "vehicle_violations"
      ADD CONSTRAINT "vehicle_violations_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "vehicle_violations_parkingCode_idx" ON "vehicle_violations"("parkingCode");
CREATE INDEX IF NOT EXISTS "vehicle_violations_createdById_idx" ON "vehicle_violations"("createdById");
CREATE INDEX IF NOT EXISTS "vehicle_violations_violationType_idx" ON "vehicle_violations"("violationType");
CREATE INDEX IF NOT EXISTS "vehicle_violations_createdAt_idx" ON "vehicle_violations"("createdAt");
CREATE INDEX IF NOT EXISTS "vehicle_violations_closedAt_idx" ON "vehicle_violations"("closedAt");
CREATE INDEX IF NOT EXISTS "vehicle_violations_updatedAt_idx" ON "vehicle_violations"("updatedAt");

-- Attachment enhancements
ALTER TABLE "violation_attachments"
  ADD COLUMN IF NOT EXISTS "imagePath" TEXT,
  ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
