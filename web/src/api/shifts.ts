import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  ShiftAssignablePerson,
  ShiftHandoverBoard,
  ShiftHandoverRecord,
  ShiftOpsBoard,
  ShiftOverview,
  ShiftPersonnel,
  ShiftStatistics,
  UpdateCycleConfigPayload,
  UpsertHandoverPayload,
  OperationalStatus,
} from '../types/shifts';

export const SHIFTS_QUERY_KEYS = {
  all: ['shifts'] as const,
  overview: ['shifts', 'overview'] as const,
  opsBoard: ['shifts', 'ops-board'] as const,
  personnel: (roleCodes?: string[]) => ['shifts', 'personnel', roleCodes] as const,
  assignable: ['shifts', 'assignable'] as const,
  handover: ['shifts', 'handover'] as const,
  statistics: (from?: string, to?: string) => ['shifts', 'statistics', from, to] as const,
};

export async function fetchShiftOverview(): Promise<ShiftOverview> {
  const { data } = await apiClient.get<ApiResponse<ShiftOverview>>('/shifts/overview');
  return data.data;
}

export async function fetchShiftOpsBoard(): Promise<ShiftOpsBoard> {
  const { data } = await apiClient.get<ApiResponse<ShiftOpsBoard>>('/shifts/ops-board');
  return data.data;
}

export async function fetchShiftPersonnel(roleCodes?: string[]): Promise<ShiftPersonnel[]> {
  const { data } = await apiClient.get<ApiResponse<ShiftPersonnel[]>>('/shifts/personnel', {
    params: roleCodes?.length ? { roleCodes: roleCodes.join(',') } : undefined,
  });
  return data.data;
}

export async function fetchShiftAssignable(): Promise<ShiftAssignablePerson[]> {
  const { data } = await apiClient.get<ApiResponse<ShiftAssignablePerson[]>>('/shifts/assignable');
  return data.data;
}

export async function updatePersonnelStatus(
  userId: string,
  status: OperationalStatus,
): Promise<{ id: string; fullName: string; employeeNumber: string; operationalStatus: OperationalStatus }> {
  const { data } = await apiClient.patch<
    ApiResponse<{ id: string; fullName: string; employeeNumber: string; operationalStatus: OperationalStatus }>
  >(`/shifts/personnel/${userId}/status`, { status });
  return data.data;
}

export async function updateCycleConfig(payload: UpdateCycleConfigPayload): Promise<ShiftOverview['config']> {
  const { data } = await apiClient.patch<ApiResponse<ShiftOverview['config']>>('/shifts/cycle-config', payload);
  return data.data;
}

export async function fetchHandoverBoard(): Promise<ShiftHandoverBoard> {
  const { data } = await apiClient.get<ApiResponse<ShiftHandoverBoard>>('/shifts/handover');
  return data.data;
}

export async function upsertHandover(payload: UpsertHandoverPayload): Promise<ShiftHandoverRecord> {
  const { data } = await apiClient.post<ApiResponse<ShiftHandoverRecord>>('/shifts/handover', payload);
  return data.data;
}

export async function approveHandover(handoverId: string): Promise<ShiftHandoverRecord> {
  const { data } = await apiClient.post<ApiResponse<ShiftHandoverRecord>>(
    `/shifts/handover/${handoverId}/approve-handover`,
  );
  return data.data;
}

export async function approveTakeover(handoverId: string): Promise<ShiftHandoverRecord> {
  const { data } = await apiClient.post<ApiResponse<ShiftHandoverRecord>>(
    `/shifts/handover/${handoverId}/approve-takeover`,
  );
  return data.data;
}

export async function fetchShiftStatistics(from?: string, to?: string): Promise<ShiftStatistics> {
  const { data } = await apiClient.get<ApiResponse<ShiftStatistics>>('/shifts/statistics', {
    params: { from, to },
  });
  return data.data;
}
