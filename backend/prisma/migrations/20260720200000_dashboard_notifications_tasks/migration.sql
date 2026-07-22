-- Sprint 10: Dashboard, notifications inbox, tasks, realtime scaffolding

-- Notification sender (optional)
ALTER TABLE "notifications" ADD COLUMN "senderId" UUID;

CREATE INDEX "notifications_senderId_idx" ON "notifications"("senderId");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Task enums
CREATE TYPE "TaskStatus" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'OVERDUE',
  'CANCELLED'
);

CREATE TYPE "TaskPriority" AS ENUM (
  'LOW',
  'NORMAL',
  'HIGH',
  'CRITICAL'
);

-- Tasks table
CREATE TABLE "tasks" (
  "id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
  "priority" "TaskPriority" NOT NULL DEFAULT 'NORMAL',
  "assigneeId" UUID NOT NULL,
  "assignerId" UUID,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "entityType" TEXT,
  "entityId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_assigneeId_fkey"
  FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_assignerId_fkey"
  FOREIGN KEY ("assignerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "tasks_assigneeId_status_idx" ON "tasks"("assigneeId", "status");
CREATE INDEX "tasks_dueAt_idx" ON "tasks"("dueAt");
CREATE INDEX "tasks_deletedAt_idx" ON "tasks"("deletedAt");
