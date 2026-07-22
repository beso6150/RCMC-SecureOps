import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { Permission } from '../types/director';

export const PERMISSIONS_QUERY_KEYS = {
  list: ['permissions'] as const,
};

export async function listPermissions(): Promise<Permission[]> {
  const { data } = await apiClient.get<ApiResponse<Permission[]>>('/permissions');
  return data.data;
}
