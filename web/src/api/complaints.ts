import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  Complaint,
  ComplaintStatistics,
  ComplaintStatus,
  ListComplaintsParams,
  PaginatedResponse,
} from '../types/director';

export const COMPLAINTS_QUERY_KEYS = {
  list: (params?: ListComplaintsParams) => ['complaints', params] as const,
  detail: (id: string) => ['complaints', id] as const,
  statistics: (params?: { from?: string; to?: string }) =>
    ['complaints', 'statistics', params] as const,
};

export async function listComplaints(
  params: ListComplaintsParams = {},
): Promise<PaginatedResponse<Complaint>> {
  const { data } = await apiClient.get<
    ApiResponse<Complaint[]> & { meta: PaginatedResponse<Complaint>['meta'] }
  >('/complaints', { params });
  return { data: data.data, meta: data.meta };
}

export async function getComplaint(id: string): Promise<Complaint> {
  const { data } = await apiClient.get<ApiResponse<Complaint>>(`/complaints/${id}`);
  return data.data;
}

export async function createComplaint(payload: {
  title: string;
  description: string;
  locationId?: string | null;
}): Promise<Complaint> {
  const { data } = await apiClient.post<ApiResponse<Complaint>>('/complaints', payload);
  return data.data;
}

export async function updateComplaint(
  id: string,
  payload: { title?: string; description?: string },
): Promise<Complaint> {
  const { data } = await apiClient.patch<ApiResponse<Complaint>>(`/complaints/${id}`, payload);
  return data.data;
}

export async function reviewComplaint(
  id: string,
  payload: { status: ComplaintStatus; reviewNotes?: string | null },
): Promise<Complaint> {
  const { data } = await apiClient.post<ApiResponse<Complaint>>(
    `/complaints/${id}/review`,
    payload,
  );
  return data.data;
}

export async function fetchComplaintStatistics(params?: {
  from?: string;
  to?: string;
}): Promise<ComplaintStatistics> {
  const { data } = await apiClient.get<ApiResponse<ComplaintStatistics>>(
    '/complaints/statistics',
    { params },
  );
  return data.data;
}

export async function downloadComplaintPdf(id: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/complaints/${id}/pdf`, {
    responseType: 'blob',
  });
  return data;
}
