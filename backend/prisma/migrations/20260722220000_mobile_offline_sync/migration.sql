-- Sprint 20: Mobile offline sync + device registry
-- Client timezone reference: Asia/Riyadh

CREATE TYPE "MobileSyncStatus" AS ENUM (
  'RECEIVED',
  'PROCESSING',
  'COMPLETED',
  'REJECTED',
  'CONFLICT',
  'FAILED'
);

CREATE TYPE "MobileDevicePlatform" AS ENUM (
  'ANDROID',
  'IOS',
  'OTHER'
);

CREATE TABLE "user_mobile_devices" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "deviceUuid" TEXT NOT NULL,
  "platform" "MobileDevicePlatform" NOT NULL,
  "appVersion" TEXT NOT NULL,
  "deviceNameMasked" TEXT,
  "lastLoginAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "pushCapability" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "user_mobile_devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mobile_sync_operations" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "deviceId" UUID,
  "idempotencyKey" TEXT NOT NULL,
  "operationType" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "localEntityId" TEXT,
  "serverEntityId" TEXT,
  "status" "MobileSyncStatus" NOT NULL,
  "requestHash" TEXT,
  "responseSummaryJson" TEXT,
  "failureReason" TEXT,
  "clientCreatedAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "mobile_sync_operations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_mobile_devices_userId_deviceUuid_key" ON "user_mobile_devices"("userId", "deviceUuid");
CREATE INDEX "user_mobile_devices_userId_idx" ON "user_mobile_devices"("userId");
CREATE INDEX "user_mobile_devices_isActive_idx" ON "user_mobile_devices"("isActive");

CREATE UNIQUE INDEX "mobile_sync_operations_userId_idempotencyKey_key" ON "mobile_sync_operations"("userId", "idempotencyKey");
CREATE INDEX "mobile_sync_operations_userId_idx" ON "mobile_sync_operations"("userId");
CREATE INDEX "mobile_sync_operations_status_idx" ON "mobile_sync_operations"("status");
CREATE INDEX "mobile_sync_operations_receivedAt_idx" ON "mobile_sync_operations"("receivedAt");
CREATE INDEX "mobile_sync_operations_deviceId_idx" ON "mobile_sync_operations"("deviceId");
CREATE INDEX "mobile_sync_operations_operationType_idx" ON "mobile_sync_operations"("operationType");

ALTER TABLE "user_mobile_devices" ADD CONSTRAINT "user_mobile_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mobile_sync_operations" ADD CONSTRAINT "mobile_sync_operations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mobile_sync_operations" ADD CONSTRAINT "mobile_sync_operations_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "user_mobile_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
