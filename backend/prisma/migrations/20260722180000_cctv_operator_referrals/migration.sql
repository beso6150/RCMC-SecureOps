-- Sprint 16: CCTV Operator Operations & Security Referrals

CREATE TYPE "SecurityPermitType" AS ENUM (
  'VISITOR', 'VEHICLE', 'CONTRACTOR', 'MAINTENANCE', 'DELIVERY',
  'TEMPORARY_ACCESS', 'VIP', 'OTHER'
);
CREATE TYPE "SecurityPermitStatus" AS ENUM (
  'DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'USED', 'REJECTED'
);
CREATE TYPE "PermitImportance" AS ENUM ('NORMAL', 'IMPORTANT', 'URGENT');
CREATE TYPE "PermitShareStatus" AS ENUM (
  'SENT', 'DELIVERED', 'VIEWED', 'ACKNOWLEDGED', 'FAILED'
);
CREATE TYPE "SecurityReferralType" AS ENUM (
  'SUSPICIOUS_PERSON', 'SUSPICIOUS_VEHICLE', 'PARKING_VIOLATION', 'UNAUTHORIZED_ACCESS',
  'DOOR_OPEN', 'CROWDING', 'SAFETY_RISK', 'LOST_ITEM', 'PROPERTY_DAMAGE',
  'SECURITY_OBSERVATION', 'OTHER'
);
CREATE TYPE "SecurityReferralSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "SecurityReferralStatus" AS ENUM (
  'NEW', 'SENT', 'RECEIVED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED',
  'REJECTED', 'CANCELLED', 'ESCALATED'
);
CREATE TYPE "ReferralAttachmentType" AS ENUM (
  'IMAGE', 'SCREENSHOT', 'DOCUMENT', 'VIDEO_SHORT', 'OTHER'
);
CREATE TYPE "ReferralUpdateType" AS ENUM (
  'CREATED', 'SENT', 'RECEIVED', 'STATUS_CHANGED', 'NOTE_ADDED', 'ASSIGNED',
  'REASSIGNED', 'ARRIVED', 'RESOLVED', 'ESCALATED', 'REJECTED', 'CANCELLED',
  'CLOSED', 'ATTACHMENT_ADDED'
);
CREATE TYPE "ReferralResponseType" AS ENUM (
  'ACKNOWLEDGEMENT', 'FIELD_UPDATE', 'RESOLUTION', 'REJECTION', 'REQUEST_MORE_INFO'
);

CREATE TABLE "security_permits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "permitNumber" TEXT NOT NULL,
    "permitType" "SecurityPermitType" NOT NULL,
    "title" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "nationalId" TEXT,
    "employeeNumber" TEXT,
    "companyName" TEXT,
    "vehiclePlate" TEXT,
    "vehicleType" TEXT,
    "hostName" TEXT,
    "hostDepartment" TEXT,
    "allowedZoneId" UUID,
    "allowedFloor" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "status" "SecurityPermitStatus" NOT NULL DEFAULT 'DRAFT',
    "importance" "PermitImportance" NOT NULL DEFAULT 'NORMAL',
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "attachmentStoragePath" TEXT,
    "attachmentFileName" TEXT,
    "attachmentMimeType" TEXT,
    "attachmentFileSize" INTEGER,
    "cancelReason" TEXT,
    "rejectReason" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "security_permits_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "security_permits_permitNumber_key" ON "security_permits"("permitNumber");
CREATE INDEX "security_permits_status_idx" ON "security_permits"("status");
CREATE INDEX "security_permits_permitType_idx" ON "security_permits"("permitType");
CREATE INDEX "security_permits_importance_idx" ON "security_permits"("importance");
CREATE INDEX "security_permits_createdById_idx" ON "security_permits"("createdById");
CREATE INDEX "security_permits_validFrom_validTo_idx" ON "security_permits"("validFrom", "validTo");
CREATE INDEX "security_permits_vehiclePlate_idx" ON "security_permits"("vehiclePlate");
CREATE INDEX "security_permits_deletedAt_idx" ON "security_permits"("deletedAt");
ALTER TABLE "security_permits" ADD CONSTRAINT "security_permits_allowedZoneId_fkey"
  FOREIGN KEY ("allowedZoneId") REFERENCES "security_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "security_permits" ADD CONSTRAINT "security_permits_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "permit_shares" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "permitId" UUID NOT NULL,
    "sharedById" UUID NOT NULL,
    "sharedWithUserId" UUID,
    "sharedWithGroupId" UUID,
    "sharedWithRole" TEXT,
    "checkpointId" UUID,
    "message" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "status" "PermitShareStatus" NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permit_shares_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "permit_shares_permitId_idx" ON "permit_shares"("permitId");
CREATE INDEX "permit_shares_sharedWithUserId_idx" ON "permit_shares"("sharedWithUserId");
CREATE INDEX "permit_shares_sharedWithGroupId_idx" ON "permit_shares"("sharedWithGroupId");
CREATE INDEX "permit_shares_status_idx" ON "permit_shares"("status");
CREATE INDEX "permit_shares_sentAt_idx" ON "permit_shares"("sentAt");
ALTER TABLE "permit_shares" ADD CONSTRAINT "permit_shares_permitId_fkey"
  FOREIGN KEY ("permitId") REFERENCES "security_permits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "permit_shares" ADD CONSTRAINT "permit_shares_sharedById_fkey"
  FOREIGN KEY ("sharedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "permit_shares" ADD CONSTRAINT "permit_shares_sharedWithUserId_fkey"
  FOREIGN KEY ("sharedWithUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "permit_shares" ADD CONSTRAINT "permit_shares_sharedWithGroupId_fkey"
  FOREIGN KEY ("sharedWithGroupId") REFERENCES "shift_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "security_referrals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referralNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "referralType" "SecurityReferralType" NOT NULL,
    "severity" "SecurityReferralSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "SecurityReferralStatus" NOT NULL DEFAULT 'NEW',
    "zoneId" UUID,
    "checkpointId" UUID,
    "floorNumber" INTEGER,
    "cameraCode" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "assignedUserId" UUID,
    "assignedGroupId" UUID,
    "assignedById" UUID,
    "assignedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "escalationLevel" INTEGER NOT NULL DEFAULT 0,
    "escalatedAt" TIMESTAMP(3),
    "escalationReason" TEXT,
    "resolutionSummary" TEXT,
    "rejectionReason" TEXT,
    "cancellationReason" TEXT,
    "needsFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "security_referrals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "security_referrals_referralNumber_key" ON "security_referrals"("referralNumber");
CREATE INDEX "security_referrals_status_idx" ON "security_referrals"("status");
CREATE INDEX "security_referrals_severity_idx" ON "security_referrals"("severity");
CREATE INDEX "security_referrals_referralType_idx" ON "security_referrals"("referralType");
CREATE INDEX "security_referrals_createdById_idx" ON "security_referrals"("createdById");
CREATE INDEX "security_referrals_assignedUserId_idx" ON "security_referrals"("assignedUserId");
CREATE INDEX "security_referrals_assignedGroupId_idx" ON "security_referrals"("assignedGroupId");
CREATE INDEX "security_referrals_zoneId_idx" ON "security_referrals"("zoneId");
CREATE INDEX "security_referrals_occurredAt_idx" ON "security_referrals"("occurredAt");
CREATE INDEX "security_referrals_deletedAt_idx" ON "security_referrals"("deletedAt");
ALTER TABLE "security_referrals" ADD CONSTRAINT "security_referrals_zoneId_fkey"
  FOREIGN KEY ("zoneId") REFERENCES "security_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "security_referrals" ADD CONSTRAINT "security_referrals_checkpointId_fkey"
  FOREIGN KEY ("checkpointId") REFERENCES "security_checkpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "security_referrals" ADD CONSTRAINT "security_referrals_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "security_referrals" ADD CONSTRAINT "security_referrals_assignedUserId_fkey"
  FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "security_referrals" ADD CONSTRAINT "security_referrals_assignedGroupId_fkey"
  FOREIGN KEY ("assignedGroupId") REFERENCES "shift_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "security_referrals" ADD CONSTRAINT "security_referrals_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "security_referral_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referralId" UUID NOT NULL,
    "attachmentType" "ReferralAttachmentType" NOT NULL DEFAULT 'IMAGE',
    "fileName" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "uploadedById" UUID NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "security_referral_attachments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "security_referral_attachments_referralId_idx" ON "security_referral_attachments"("referralId");
CREATE INDEX "security_referral_attachments_uploadedById_idx" ON "security_referral_attachments"("uploadedById");
CREATE INDEX "security_referral_attachments_deletedAt_idx" ON "security_referral_attachments"("deletedAt");
ALTER TABLE "security_referral_attachments" ADD CONSTRAINT "security_referral_attachments_referralId_fkey"
  FOREIGN KEY ("referralId") REFERENCES "security_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "security_referral_attachments" ADD CONSTRAINT "security_referral_attachments_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "security_referral_updates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referralId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "updateType" "ReferralUpdateType" NOT NULL,
    "message" TEXT,
    "oldStatus" "SecurityReferralStatus",
    "newStatus" "SecurityReferralStatus",
    "attachmentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "security_referral_updates_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "security_referral_updates_referralId_createdAt_idx" ON "security_referral_updates"("referralId", "createdAt");
CREATE INDEX "security_referral_updates_userId_idx" ON "security_referral_updates"("userId");
ALTER TABLE "security_referral_updates" ADD CONSTRAINT "security_referral_updates_referralId_fkey"
  FOREIGN KEY ("referralId") REFERENCES "security_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "security_referral_updates" ADD CONSTRAINT "security_referral_updates_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "security_referral_updates" ADD CONSTRAINT "security_referral_updates_attachmentId_fkey"
  FOREIGN KEY ("attachmentId") REFERENCES "security_referral_attachments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "referral_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referralId" UUID NOT NULL,
    "responderId" UUID NOT NULL,
    "responseType" "ReferralResponseType" NOT NULL,
    "result" TEXT NOT NULL,
    "notes" TEXT,
    "attachmentUrl" TEXT,
    "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "referral_responses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "referral_responses_referralId_idx" ON "referral_responses"("referralId");
CREATE INDEX "referral_responses_responderId_idx" ON "referral_responses"("responderId");
CREATE INDEX "referral_responses_respondedAt_idx" ON "referral_responses"("respondedAt");
ALTER TABLE "referral_responses" ADD CONSTRAINT "referral_responses_referralId_fkey"
  FOREIGN KEY ("referralId") REFERENCES "security_referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_responses" ADD CONSTRAINT "referral_responses_responderId_fkey"
  FOREIGN KEY ("responderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
