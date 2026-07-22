import {
  NotificationActionType,
  NotificationCategory,
  NotificationKind,
  NotificationPriority,
  NotificationStatus,
  Prisma,
} from '@prisma/client';

export const notificationInclude = {
  sender: {
    select: {
      id: true,
      fullName: true,
      employeeNumber: true,
    },
  },
} satisfies Prisma.NotificationInclude;

export type NotificationWithSender = Prisma.NotificationGetPayload<{
  include: typeof notificationInclude;
}>;

export interface NotificationListFilters {
  page?: number;
  pageSize?: number;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  isRead?: boolean;
}

export interface CreateNotificationData {
  userId: string;
  senderId?: string | null;
  title: string;
  body: string;
  shortBody?: string | null;
  priority?: NotificationPriority;
  entityType?: string | null;
  entityId?: string | null;
  /** Sprint 19 optional extensions — existing callers unchanged. */
  category?: NotificationCategory | null;
  kind?: NotificationKind | string | null;
  actionUrl?: string | null;
  actionType?: NotificationActionType | string | null;
  requiresAcknowledgement?: boolean;
  deduplicationKey?: string | null;
  metadataJson?: unknown;
  recipientRole?: string | null;
  recipientGroupId?: string | null;
  recipientShiftId?: string | null;
  expiresAt?: Date | null;
  scheduledFor?: Date | null;
}
