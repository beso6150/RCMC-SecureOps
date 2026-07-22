import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  CreateUserPayload,
  ListUsersParams,
  PaginatedResponse,
  UpdateUserPayload,
  UserRecord,
} from '../types/director';

export const USERS_QUERY_KEYS = {
  list: (params?: ListUsersParams) => ['users', params] as const,
  detail: (id: string) => ['users', id] as const,
};

export async function listUsers(
  params: ListUsersParams = {},
): Promise<PaginatedResponse<UserRecord>> {
  const { data } = await apiClient.get<
    ApiResponse<UserRecord[]> & { meta: PaginatedResponse<UserRecord>['meta'] }
  >('/users', { params });
  return { data: data.data, meta: data.meta };
}

export async function getUser(id: string): Promise<UserRecord> {
  const { data } = await apiClient.get<ApiResponse<UserRecord>>(`/users/${id}`);
  return data.data;
}

export async function createUser(payload: CreateUserPayload): Promise<UserRecord> {
  const { data } = await apiClient.post<ApiResponse<UserRecord>>('/users', payload);
  return data.data;
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<UserRecord> {
  const { data } = await apiClient.patch<ApiResponse<UserRecord>>(`/users/${id}`, payload);
  return data.data;
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}

export async function resetUserPassword(id: string): Promise<{ temporaryPassword?: string }> {
  const { data } = await apiClient.post<ApiResponse<{ temporaryPassword?: string }>>(
    `/users/${id}/reset-password`,
  );
  return data.data;
}
