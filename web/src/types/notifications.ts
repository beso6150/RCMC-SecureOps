export type NotificationStatus =
  | 'PENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'UNREAD'
  | 'READ'
  | 'ACKNOWLEDGED'
  | 'EXPIRED'
  | 'FAILED'
  | 'CANCELLED';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'CRITICAL';

export type NotificationCategory =
  | 'INCIDENT'
  | 'EMERGENCY'
  | 'CCTV_REFERRAL'
  | 'PERMIT'
  | 'PATROL'
  | 'CHECKPOINT'
  | 'FIELD_ALERT'
  | 'SOS'
  | 'VEHICLE_VIOLATION'
  | 'VISITOR'
  | 'SHIFT'
  | 'HANDOVER'
  | 'TASK'
  | 'REPORT'
  | 'APPROVAL'
  | 'SECURITY'
  | 'SYSTEM'
  | 'MESSAGE';

export type NotificationKind =
  | 'INFORMATIONAL'
  | 'ACTION_REQUIRED'
  | 'ACKNOWLEDGEMENT_REQUIRED'
  | 'URGENT'
  | 'CRITICAL';

export type NotificationActionType =
  | 'OPEN'
  | 'ACKNOWLEDGE'
  | 'ACCEPT'
  | 'REJECT'
  | 'START'
  | 'RESOLVE'
  | 'REVIEW'
  | 'APPROVE'
  | 'NONE';

export interface NotificationUserRef {
  id: string;
  fullName: string;
  employeeNumber: string;
}

export interface NotificationRecord {
  id: string;
  notificationNumber?: string | null;
  title: string;
  body: string;
  shortBody?: string | null;
  priority: NotificationPriority;
  status: NotificationStatus;
  kind?: NotificationKind;
  category?: NotificationCategory | null;
  entityType: string | null;
  entityId: string | null;
  actionUrl?: string | null;
  actionType?: NotificationActionType;
  requiresAcknowledgement?: boolean;
  acknowledgedAt?: string | null;
  isRead?: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
  sender: NotificationUserRef | null;
}

export interface ListNotificationsParams {
  page?: number;
  pageSize?: number;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  isRead?: boolean;
}

export interface UnreadCountResponse {
  count: number;
}

export interface NotificationStatistics {
  unread: number;
  requiresAcknowledgement: number;
  byPriority: Array<{ priority: NotificationPriority; count: number }>;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  category: NotificationCategory;
  inAppEnabled: boolean;
  socketEnabled: boolean;
  pushEnabled: boolean;
  soundEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursFrom: string | null;
  quietHoursTo: string | null;
  minimumPriority: NotificationPriority;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertNotificationPreferencePayload {
  category: NotificationCategory;
  inAppEnabled?: boolean;
  socketEnabled?: boolean;
  pushEnabled?: boolean;
  soundEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursFrom?: string | null;
  quietHoursTo?: string | null;
  minimumPriority?: NotificationPriority;
}

export interface NotificationRule {
  id: string;
  name: string;
  eventType: string;
  category: NotificationCategory;
  minimumSeverity: string | null;
  targetRolesJson: unknown;
  targetGroupsJson: unknown;
  notificationPriority: NotificationPriority;
  requiresAcknowledgement: boolean;
  reminderAfterMinutes: number | null;
  escalationAfterMinutes: number | null;
  maxReminders: number;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationRulePayload {
  name: string;
  eventType: string;
  category: NotificationCategory;
  minimumSeverity?: string | null;
  targetRolesJson?: unknown;
  targetGroupsJson?: unknown;
  notificationPriority?: NotificationPriority;
  requiresAcknowledgement?: boolean;
  reminderAfterMinutes?: number | null;
  escalationAfterMinutes?: number | null;
  maxReminders?: number;
  isActive?: boolean;
}

export type UpdateNotificationRulePayload = Partial<
  Omit<CreateNotificationRulePayload, 'eventType' | 'category'>
>;
