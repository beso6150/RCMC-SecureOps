import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  Department,
  Floor,
  IncidentType,
  MeetingRoom,
  Shift,
  SystemSetting,
  ViolationStatistics,
  VisitorStatistics,
} from '../types/director';

export const SETTINGS_QUERY_KEYS = {
  system: ['settings', 'system'] as const,
  departments: ['settings', 'departments'] as const,
  shifts: ['settings', 'shifts'] as const,
  floors: ['settings', 'floors'] as const,
  meetingRooms: (floorId?: string) => ['settings', 'meeting-rooms', floorId] as const,
  incidentTypes: ['settings', 'incident-types'] as const,
  violationStats: (params?: { from?: string; to?: string }) =>
    ['violations', 'statistics', params] as const,
  visitorStats: (params?: { from?: string; to?: string }) =>
    ['visitors', 'statistics', params] as const,
};

export async function listSystemSettings(): Promise<SystemSetting[]> {
  const { data } = await apiClient.get<ApiResponse<SystemSetting[]>>('/settings/system');
  return data.data;
}

export async function updateSystemSettings(
  settings: { key: string; value: unknown; description?: string | null; isPublic?: boolean }[],
): Promise<SystemSetting[]> {
  const { data } = await apiClient.put<ApiResponse<SystemSetting[]>>('/settings/system', {
    settings,
  });
  return data.data;
}

export async function listDepartments(): Promise<Department[]> {
  const { data } = await apiClient.get<ApiResponse<Department[]>>('/settings/departments');
  return data.data;
}

export async function createDepartment(payload: {
  code: string;
  nameEn: string;
  nameAr: string;
  description?: string;
}): Promise<Department> {
  const { data } = await apiClient.post<ApiResponse<Department>>(
    '/settings/departments',
    payload,
  );
  return data.data;
}

export async function updateDepartment(
  id: string,
  payload: Partial<{ code: string; nameEn: string; nameAr: string; description: string }>,
): Promise<Department> {
  const { data } = await apiClient.patch<ApiResponse<Department>>(
    `/settings/departments/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteDepartment(id: string): Promise<void> {
  await apiClient.delete(`/settings/departments/${id}`);
}

export async function listShifts(): Promise<Shift[]> {
  const { data } = await apiClient.get<ApiResponse<Shift[]>>('/settings/shifts');
  return data.data;
}

export async function createShift(payload: {
  code: string;
  nameEn: string;
  nameAr: string;
  startTime: string;
  endTime: string;
  timezone?: string;
}): Promise<Shift> {
  const { data } = await apiClient.post<ApiResponse<Shift>>('/settings/shifts', payload);
  return data.data;
}

export async function updateShift(
  id: string,
  payload: Partial<{
    code: string;
    nameEn: string;
    nameAr: string;
    startTime: string;
    endTime: string;
    timezone: string;
  }>,
): Promise<Shift> {
  const { data } = await apiClient.patch<ApiResponse<Shift>>(`/settings/shifts/${id}`, payload);
  return data.data;
}

export async function deleteShift(id: string): Promise<void> {
  await apiClient.delete(`/settings/shifts/${id}`);
}

export async function listFloors(): Promise<Floor[]> {
  const { data } = await apiClient.get<ApiResponse<Floor[]>>('/visitors/floors');
  return data.data;
}

export async function updateFloor(
  id: string,
  payload: Partial<{ code: string; nameEn: string; nameAr: string; level: number }>,
): Promise<Floor> {
  const { data } = await apiClient.patch<ApiResponse<Floor>>(`/visitors/floors/${id}`, payload);
  return data.data;
}

export async function listMeetingRooms(floorId?: string): Promise<MeetingRoom[]> {
  const { data } = await apiClient.get<ApiResponse<MeetingRoom[]>>('/visitors/meeting-rooms', {
    params: floorId ? { floorId } : undefined,
  });
  return data.data;
}

export async function createMeetingRoom(payload: {
  floorId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  capacity?: number | null;
  isActive?: boolean;
}): Promise<MeetingRoom> {
  const { data } = await apiClient.post<ApiResponse<MeetingRoom>>(
    '/visitors/meeting-rooms',
    payload,
  );
  return data.data;
}

export async function updateMeetingRoom(
  id: string,
  payload: Partial<{
    floorId: string;
    code: string;
    nameEn: string;
    nameAr: string;
    capacity: number | null;
    isActive: boolean;
  }>,
): Promise<MeetingRoom> {
  const { data } = await apiClient.patch<ApiResponse<MeetingRoom>>(
    `/visitors/meeting-rooms/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteMeetingRoom(id: string): Promise<void> {
  await apiClient.delete(`/visitors/meeting-rooms/${id}`);
}

export async function listIncidentTypes(): Promise<IncidentType[]> {
  const { data } = await apiClient.get<ApiResponse<IncidentType[]>>('/incidents/types');
  return data.data;
}

export async function createIncidentType(payload: {
  code: string;
  nameAr: string;
  nameEn: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}): Promise<IncidentType> {
  const { data } = await apiClient.post<ApiResponse<IncidentType>>('/incidents/types', payload);
  return data.data;
}

export async function updateIncidentType(
  id: string,
  payload: Partial<{
    code: string;
    nameAr: string;
    nameEn: string;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
  }>,
): Promise<IncidentType> {
  const { data } = await apiClient.patch<ApiResponse<IncidentType>>(
    `/incidents/types/${id}`,
    payload,
  );
  return data.data;
}

export async function fetchViolationStatistics(params?: {
  from?: string;
  to?: string;
}): Promise<ViolationStatistics> {
  const { data } = await apiClient.get<ApiResponse<ViolationStatistics>>(
    '/violations/statistics',
    { params },
  );
  return data.data;
}

export async function fetchVisitorStatistics(params?: {
  from?: string;
  to?: string;
}): Promise<VisitorStatistics> {
  const { data } = await apiClient.get<ApiResponse<VisitorStatistics>>('/visitors/statistics', {
    params,
  });
  return data.data;
}
