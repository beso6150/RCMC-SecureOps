import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { PaginatedResponse } from '../types/director';
import type {
  CreateNotificationRulePayload,
  ListNotificationsParams,
  NotificationPreference,
  NotificationRecord,
  NotificationRule,
  NotificationStatistics,
  UnreadCountResponse,
  UpdateNotificationRulePayload,
  UpsertNotificationPreferencePayload,
} from '../types/notifications';

export const NOTIFICATIONS_QUERY_KEYS = {
  all: ['notifications'] as const,
  list: (params?: ListNotificationsParams) => ['notifications', 'list', params] as const,
  detail: (id: string) => ['notifications', 'detail', id] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  statistics: ['notifications', 'statistics'] as const,
  preferences: ['notifications', 'preferences'] as const,
  rules: ['notifications', 'rules'] as const,
};

export async function listNotifications(
  params: ListNotificationsParams = {},
): Promise<PaginatedResponse<NotificationRecord>> {
  const { data } = await apiClient.get<
    ApiResponse<NotificationRecord[]> & { meta: PaginatedResponse<NotificationRecord>['meta'] }
  >('/notifications', { params });
  return { data: data.data, meta: data.meta };
}

export async function getNotification(id: string): Promise<NotificationRecord> {
  const { data } = await apiClient.get<ApiResponse<NotificationRecord>>(`/notifications/${id}`);
  return data.data;
}

export async function markNotificationRead(id: string): Promise<NotificationRecord> {
  const { data } = await apiClient.post<ApiResponse<NotificationRecord>>(
    `/notifications/${id}/read`,
  );
  return data.data;
}

export async function markAllNotificationsRead(): Promise<{ updated: number }> {
  const { data } = await apiClient.post<ApiResponse<{ updated: number }>>('/notifications/read-all');
  return data.data;
}

export async function acknowledgeNotification(id: string): Promise<NotificationRecord> {
  const { data } = await apiClient.post<ApiResponse<NotificationRecord>>(
    `/notifications/${id}/acknowledge`,
  );
  return data.data;
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const { data } = await apiClient.get<ApiResponse<UnreadCountResponse>>(
    '/notifications/unread-count',
  );
  return data.data.count;
}

export async function fetchNotificationStatistics(): Promise<NotificationStatistics> {
  const { data } = await apiClient.get<ApiResponse<NotificationStatistics>>(
    '/notifications/statistics',
  );
  return data.data;
}

export async function listNotificationPreferences(): Promise<NotificationPreference[]> {
  const { data } = await apiClient.get<ApiResponse<NotificationPreference[]>>(
    '/notifications/preferences',
  );
  return data.data;
}

export async function upsertNotificationPreference(
  payload: UpsertNotificationPreferencePayload,
): Promise<NotificationPreference> {
  const { data } = await apiClient.put<ApiResponse<NotificationPreference>>(
    '/notifications/preferences',
    payload,
  );
  return data.data;
}

export async function listNotificationRules(): Promise<NotificationRule[]> {
  const { data } = await apiClient.get<ApiResponse<NotificationRule[]>>('/notifications/rules');
  return data.data;
}

export async function createNotificationRule(
  payload: CreateNotificationRulePayload,
): Promise<NotificationRule> {
  const { data } = await apiClient.post<ApiResponse<NotificationRule>>(
    '/notifications/rules',
    payload,
  );
  return data.data;
}

export async function updateNotificationRule(
  id: string,
  payload: UpdateNotificationRulePayload,
): Promise<NotificationRule> {
  const { data } = await apiClient.patch<ApiResponse<NotificationRule>>(
    `/notifications/rules/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteNotificationRule(id: string): Promise<{ deleted: boolean }> {
  const { data } = await apiClient.delete<ApiResponse<{ deleted: boolean }>>(
    `/notifications/rules/${id}`,
  );
  return data.data;
}
