-- Sprint 19: Notifications (extended), internal communications, operational tasks

-- ─── Enum expansions ─────────────────────────────────────────────
ALTER TYPE "NotificationPriority" ADD VALUE IF NOT EXISTS 'URGENT';

ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'SENT';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'FAILED';
ALTER TYPE "NotificationStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'NEW';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'ASSIGNED';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'WAITING';
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TYPE "TaskPriority" ADD VALUE IF NOT EXISTS 'URGENT';

-- ─── New enums ───────────────────────────────────────────────────
CREATE TYPE "NotificationCategory" AS ENUM (
  'INCIDENT',
  'EMERGENCY',
  'CCTV_REFERRAL',
  'PERMIT',
  'PATROL',
  'CHECKPOINT',
  'FIELD_ALERT',
  'SOS',
  'VEHICLE_VIOLATION',
  'VISITOR',
  'SHIFT',
  'HANDOVER',
  'TASK',
  'REPORT',
  'APPROVAL',
  'SECURITY',
  'SYSTEM',
  'MESSAGE'
);

CREATE TYPE "NotificationKind" AS ENUM (
  'INFORMATIONAL',
  'ACTION_REQUIRED',
  'ACKNOWLEDGEMENT_REQUIRED',
  'URGENT',
  'CRITICAL'
);

CREATE TYPE "NotificationActionType" AS ENUM (
  'OPEN',
  'ACKNOWLEDGE',
  'ACCEPT',
  'REJECT',
  'START',
  'RESOLVE',
  'REVIEW',
  'APPROVE',
  'NONE'
);

CREATE TYPE "NotificationDeliveryChannel" AS ENUM (
  'IN_APP',
  'SOCKET',
  'WEB_PUSH',
  'MOBILE_PUSH'
);

CREATE TYPE "NotificationDeliveryStatus" AS ENUM (
  'PENDING',
  'SENT',
  'DELIVERED',
  'FAILED',
  'SKIPPED'
);

CREATE TYPE "ConversationType" AS ENUM (
  'DIRECT',
  'GROUP',
  'INCIDENT',
  'REFERRAL',
  'SHIFT',
  'OPERATIONS',
  'TASK'
);

CREATE TYPE "ConversationParticipantRole" AS ENUM (
  'OWNER',
  'ADMIN',
  'MEMBER',
  'VIEWER'
);

CREATE TYPE "InternalMessageType" AS ENUM (
  'TEXT',
  'IMAGE',
  'DOCUMENT',
  'SYSTEM',
  'STATUS_UPDATE',
  'LOCATION',
  'TASK_REFERENCE'
);

CREATE TYPE "OperationalTaskType" AS ENUM (
  'SECURITY_RESPONSE',
  'PATROL',
  'CHECKPOINT',
  'INCIDENT_FOLLOW_UP',
  'CCTV_FOLLOW_UP',
  'PERMIT_VERIFICATION',
  'VISITOR_ASSISTANCE',
  'VEHICLE_CHECK',
  'HANDOVER',
  'REPORT_REVIEW',
  'GENERAL'
);

CREATE TYPE "TaskUpdateType" AS ENUM (
  'CREATED',
  'ASSIGNED',
  'ACCEPTED',
  'STARTED',
  'NOTE_ADDED',
  'EVIDENCE_ADDED',
  'WAITING',
  'COMPLETED',
  'REJECTED',
  'REASSIGNED',
  'CANCELLED',
  'OVERDUE'
);

-- ─── Extend notifications ────────────────────────────────────────
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "notificationNumber" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "shortBody" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "kind" "NotificationKind" NOT NULL DEFAULT 'INFORMATIONAL';
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "category" "NotificationCategory";
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "actionUrl" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "actionType" "NotificationActionType" NOT NULL DEFAULT 'OPEN';
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "requiresAcknowledgement" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "acknowledgedAt" TIMESTAMP(3);
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "acknowledgedById" UUID;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "scheduledFor" TIMESTAMP(3);
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "deduplicationKey" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "escalationLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "escalatedAt" TIMESTAMP(3);
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "reminderCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "metadataJson" JSONB;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "recipientRole" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "recipientGroupId" UUID;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "recipientShiftId" UUID;

-- Backfill isRead from legacy status
UPDATE "notifications" SET "isRead" = true WHERE "status" = 'READ' AND "isRead" = false;

ALTER TABLE "notifications" ALTER COLUMN "channel" SET DEFAULT 'IN_APP';

CREATE UNIQUE INDEX IF NOT EXISTS "notifications_notificationNumber_key"
  ON "notifications"("notificationNumber");

CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "notifications_category_idx" ON "notifications"("category");
CREATE INDEX IF NOT EXISTS "notifications_deduplicationKey_userId_idx"
  ON "notifications"("deduplicationKey", "userId");
CREATE INDEX IF NOT EXISTS "notifications_requiresAcknowledgement_status_idx"
  ON "notifications"("requiresAcknowledgement", "status");

ALTER TABLE "notifications"
  DROP CONSTRAINT IF EXISTS "notifications_acknowledgedById_fkey";
ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_acknowledgedById_fkey"
  FOREIGN KEY ("acknowledgedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Extend tasks ────────────────────────────────────────────────
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "taskNumber" TEXT;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "taskType" "OperationalTaskType" NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "assignedGroupId" UUID;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "completedById" UUID;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "completionNotes" TEXT;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "requiresEvidence" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "sourceType" TEXT;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "sourceId" UUID;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "createdById" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "tasks_taskNumber_key" ON "tasks"("taskNumber");
CREATE INDEX IF NOT EXISTS "tasks_assignedGroupId_idx" ON "tasks"("assignedGroupId");
CREATE INDEX IF NOT EXISTS "tasks_status_idx" ON "tasks"("status");
CREATE INDEX IF NOT EXISTS "tasks_priority_idx" ON "tasks"("priority");
CREATE INDEX IF NOT EXISTS "tasks_taskType_idx" ON "tasks"("taskType");

ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_assignedGroupId_fkey";
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_assignedGroupId_fkey"
  FOREIGN KEY ("assignedGroupId") REFERENCES "shift_groups"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_completedById_fkey";
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_completedById_fkey"
  FOREIGN KEY ("completedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_createdById_fkey";
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── NotificationDelivery ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "notification_deliveries" (
  "id" UUID NOT NULL,
  "notificationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "channel" "NotificationDeliveryChannel" NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" TIMESTAMP(3),
  "failureReason" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notification_deliveries_notificationId_idx"
  ON "notification_deliveries"("notificationId");
CREATE INDEX IF NOT EXISTS "notification_deliveries_userId_idx"
  ON "notification_deliveries"("userId");
CREATE INDEX IF NOT EXISTS "notification_deliveries_channel_status_idx"
  ON "notification_deliveries"("channel", "status");

ALTER TABLE "notification_deliveries" DROP CONSTRAINT IF EXISTS "notification_deliveries_notificationId_fkey";
ALTER TABLE "notification_deliveries"
  ADD CONSTRAINT "notification_deliveries_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "notifications"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_deliveries" DROP CONSTRAINT IF EXISTS "notification_deliveries_userId_fkey";
ALTER TABLE "notification_deliveries"
  ADD CONSTRAINT "notification_deliveries_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── NotificationPreference ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "category" "NotificationCategory" NOT NULL,
  "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
  "socketEnabled" BOOLEAN NOT NULL DEFAULT true,
  "pushEnabled" BOOLEAN NOT NULL DEFAULT false,
  "soundEnabled" BOOLEAN NOT NULL DEFAULT false,
  "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
  "quietHoursFrom" TEXT,
  "quietHoursTo" TEXT,
  "minimumPriority" "NotificationPriority" NOT NULL DEFAULT 'LOW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_userId_category_key"
  ON "notification_preferences"("userId", "category");
CREATE INDEX IF NOT EXISTS "notification_preferences_userId_idx"
  ON "notification_preferences"("userId");

ALTER TABLE "notification_preferences" DROP CONSTRAINT IF EXISTS "notification_preferences_userId_fkey";
ALTER TABLE "notification_preferences"
  ADD CONSTRAINT "notification_preferences_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── NotificationRule ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "notification_rules" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "category" "NotificationCategory" NOT NULL,
  "minimumSeverity" TEXT,
  "targetRolesJson" JSONB,
  "targetGroupsJson" JSONB,
  "notificationPriority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
  "requiresAcknowledgement" BOOLEAN NOT NULL DEFAULT false,
  "reminderAfterMinutes" INTEGER,
  "escalationAfterMinutes" INTEGER,
  "maxReminders" INTEGER NOT NULL DEFAULT 2,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notification_rules_eventType_idx" ON "notification_rules"("eventType");
CREATE INDEX IF NOT EXISTS "notification_rules_category_idx" ON "notification_rules"("category");
CREATE INDEX IF NOT EXISTS "notification_rules_isActive_idx" ON "notification_rules"("isActive");
CREATE INDEX IF NOT EXISTS "notification_rules_deletedAt_idx" ON "notification_rules"("deletedAt");

ALTER TABLE "notification_rules" DROP CONSTRAINT IF EXISTS "notification_rules_createdById_fkey";
ALTER TABLE "notification_rules"
  ADD CONSTRAINT "notification_rules_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Internal conversations ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS "internal_conversations" (
  "id" UUID NOT NULL,
  "conversationNumber" TEXT NOT NULL,
  "title" TEXT,
  "conversationType" "ConversationType" NOT NULL,
  "entityType" TEXT,
  "entityId" UUID,
  "createdById" UUID NOT NULL,
  "isClosed" BOOLEAN NOT NULL DEFAULT false,
  "closedAt" TIMESTAMP(3),
  "closedById" UUID,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "internal_conversations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "internal_conversations_conversationNumber_key"
  ON "internal_conversations"("conversationNumber");
CREATE INDEX IF NOT EXISTS "internal_conversations_conversationType_idx"
  ON "internal_conversations"("conversationType");
CREATE INDEX IF NOT EXISTS "internal_conversations_entityType_entityId_idx"
  ON "internal_conversations"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "internal_conversations_createdById_idx"
  ON "internal_conversations"("createdById");
CREATE INDEX IF NOT EXISTS "internal_conversations_isClosed_idx"
  ON "internal_conversations"("isClosed");
CREATE INDEX IF NOT EXISTS "internal_conversations_deletedAt_idx"
  ON "internal_conversations"("deletedAt");

ALTER TABLE "internal_conversations" DROP CONSTRAINT IF EXISTS "internal_conversations_createdById_fkey";
ALTER TABLE "internal_conversations"
  ADD CONSTRAINT "internal_conversations_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "internal_conversations" DROP CONSTRAINT IF EXISTS "internal_conversations_closedById_fkey";
ALTER TABLE "internal_conversations"
  ADD CONSTRAINT "internal_conversations_closedById_fkey"
  FOREIGN KEY ("closedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "conversation_participants" (
  "id" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "role" "ConversationParticipantRole" NOT NULL DEFAULT 'MEMBER',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3),
  "lastReadAt" TIMESTAMP(3),
  "isMuted" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "conversation_participants_conversationId_userId_key"
  ON "conversation_participants"("conversationId", "userId");
CREATE INDEX IF NOT EXISTS "conversation_participants_userId_idx"
  ON "conversation_participants"("userId");
CREATE INDEX IF NOT EXISTS "conversation_participants_conversationId_idx"
  ON "conversation_participants"("conversationId");

ALTER TABLE "conversation_participants" DROP CONSTRAINT IF EXISTS "conversation_participants_conversationId_fkey";
ALTER TABLE "conversation_participants"
  ADD CONSTRAINT "conversation_participants_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "internal_conversations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversation_participants" DROP CONSTRAINT IF EXISTS "conversation_participants_userId_fkey";
ALTER TABLE "conversation_participants"
  ADD CONSTRAINT "conversation_participants_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "internal_messages" (
  "id" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "senderId" UUID NOT NULL,
  "messageType" "InternalMessageType" NOT NULL DEFAULT 'TEXT',
  "content" TEXT,
  "replyToMessageId" UUID,
  "isEdited" BOOLEAN NOT NULL DEFAULT false,
  "editedAt" TIMESTAMP(3),
  "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "deletedById" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "internal_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "internal_messages_conversationId_createdAt_idx"
  ON "internal_messages"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "internal_messages_senderId_idx" ON "internal_messages"("senderId");
CREATE INDEX IF NOT EXISTS "internal_messages_isDeleted_idx" ON "internal_messages"("isDeleted");

ALTER TABLE "internal_messages" DROP CONSTRAINT IF EXISTS "internal_messages_conversationId_fkey";
ALTER TABLE "internal_messages"
  ADD CONSTRAINT "internal_messages_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "internal_conversations"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "internal_messages" DROP CONSTRAINT IF EXISTS "internal_messages_senderId_fkey";
ALTER TABLE "internal_messages"
  ADD CONSTRAINT "internal_messages_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "internal_messages" DROP CONSTRAINT IF EXISTS "internal_messages_deletedById_fkey";
ALTER TABLE "internal_messages"
  ADD CONSTRAINT "internal_messages_deletedById_fkey"
  FOREIGN KEY ("deletedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "internal_messages" DROP CONSTRAINT IF EXISTS "internal_messages_replyToMessageId_fkey";
ALTER TABLE "internal_messages"
  ADD CONSTRAINT "internal_messages_replyToMessageId_fkey"
  FOREIGN KEY ("replyToMessageId") REFERENCES "internal_messages"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "message_attachments" (
  "id" UUID NOT NULL,
  "messageId" UUID NOT NULL,
  "fileName" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "storagePath" TEXT NOT NULL,
  "uploadedById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "message_attachments_messageId_idx" ON "message_attachments"("messageId");
CREATE INDEX IF NOT EXISTS "message_attachments_uploadedById_idx" ON "message_attachments"("uploadedById");
CREATE INDEX IF NOT EXISTS "message_attachments_deletedAt_idx" ON "message_attachments"("deletedAt");

ALTER TABLE "message_attachments" DROP CONSTRAINT IF EXISTS "message_attachments_messageId_fkey";
ALTER TABLE "message_attachments"
  ADD CONSTRAINT "message_attachments_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "internal_messages"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "message_attachments" DROP CONSTRAINT IF EXISTS "message_attachments_uploadedById_fkey";
ALTER TABLE "message_attachments"
  ADD CONSTRAINT "message_attachments_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Task updates & evidence ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "task_updates" (
  "id" UUID NOT NULL,
  "taskId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "updateType" "TaskUpdateType" NOT NULL,
  "oldStatus" "TaskStatus",
  "newStatus" "TaskStatus",
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_updates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "task_updates_taskId_createdAt_idx" ON "task_updates"("taskId", "createdAt");
CREATE INDEX IF NOT EXISTS "task_updates_userId_idx" ON "task_updates"("userId");

ALTER TABLE "task_updates" DROP CONSTRAINT IF EXISTS "task_updates_taskId_fkey";
ALTER TABLE "task_updates"
  ADD CONSTRAINT "task_updates_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "tasks"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_updates" DROP CONSTRAINT IF EXISTS "task_updates_userId_fkey";
ALTER TABLE "task_updates"
  ADD CONSTRAINT "task_updates_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "task_evidences" (
  "id" UUID NOT NULL,
  "taskId" UUID NOT NULL,
  "fileName" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "storagePath" TEXT NOT NULL,
  "uploadedById" UUID NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "task_evidences_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "task_evidences_taskId_idx" ON "task_evidences"("taskId");
CREATE INDEX IF NOT EXISTS "task_evidences_uploadedById_idx" ON "task_evidences"("uploadedById");
CREATE INDEX IF NOT EXISTS "task_evidences_deletedAt_idx" ON "task_evidences"("deletedAt");

ALTER TABLE "task_evidences" DROP CONSTRAINT IF EXISTS "task_evidences_taskId_fkey";
ALTER TABLE "task_evidences"
  ADD CONSTRAINT "task_evidences_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "tasks"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_evidences" DROP CONSTRAINT IF EXISTS "task_evidences_uploadedById_fkey";
ALTER TABLE "task_evidences"
  ADD CONSTRAINT "task_evidences_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
