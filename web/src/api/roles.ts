import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { RoleDetail, RoleSummary } from '../types/director';

export const ROLES_QUERY_KEYS = {
  list: ['roles'] as const,
  detail: (id: string) => ['roles', id] as const,
};

export async function listRoles(): Promise<RoleSummary[]> {
  const { data } = await apiClient.get<ApiResponse<RoleSummary[]>>('/roles');
  return data.data;
}

export async function getRole(id: string): Promise<RoleDetail> {
  const { data } = await apiClient.get<ApiResponse<RoleDetail>>(`/roles/${id}`);
  return data.data;
}

export async function updateRolePermissions(
  id: string,
  permissionIds: string[],
): Promise<RoleDetail> {
  const { data } = await apiClient.put<ApiResponse<RoleDetail>>(`/roles/${id}/permissions`, {
    permissionIds,
  });
  return data.data;
}
