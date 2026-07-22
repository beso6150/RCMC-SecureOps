import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  Incident,
  ListIncidentsParams,
  PaginatedResponse,
} from '../types/cctv';

export const INCIDENTS_QUERY_KEYS = {
  list: (params?: ListIncidentsParams) => ['incidents', params] as const,
  detail: (id: string) => ['incidents', id] as const,
};

export async function listIncidents(
  params: ListIncidentsParams = {},
): Promise<PaginatedResponse<Incident>> {
  const { data } = await apiClient.get<ApiResponse<Incident[]> & { meta: PaginatedResponse<Incident>['meta'] }>(
    '/incidents',
    { params },
  );
  return { data: data.data, meta: data.meta };
}

export async function getIncident(id: string): Promise<Incident> {
  const { data } = await apiClient.get<ApiResponse<Incident>>(`/incidents/${id}`);
  return data.data;
}

export async function assignIncident(
  id: string,
  body: {
    assigneeId?: string | null;
    supervisorId?: string | null;
    opsManagerId?: string | null;
  } = {},
): Promise<Incident> {
  const { data } = await apiClient.post<ApiResponse<Incident>>(`/incidents/${id}/assign`, body);
  return data.data;
}

export async function startIncident(id: string): Promise<Incident> {
  const { data } = await apiClient.post<ApiResponse<Incident>>(`/incidents/${id}/start`);
  return data.data;
}

export async function closeIncident(
  id: string,
  body: { notes?: string | null } = {},
): Promise<Incident> {
  const { data } = await apiClient.post<ApiResponse<Incident>>(`/incidents/${id}/close`, body);
  return data.data;
}
