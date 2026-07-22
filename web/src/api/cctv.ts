import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  CameraRequest,
  CctvDashboard,
  CompleteCameraRequestPayload,
  CreateCameraRequestPayload,
  ListCameraRequestsParams,
  PaginatedResponse,
  VehiclePermitSearchResult,
} from '../types/cctv';

export const CCTV_QUERY_KEYS = {
  dashboard: ['cctv', 'dashboard'] as const,
  requests: (params?: ListCameraRequestsParams) => ['camera-requests', params] as const,
  request: (id: string) => ['camera-requests', id] as const,
  permits: (plate: string) => ['cctv', 'permits', plate] as const,
};

export async function fetchCctvDashboard(): Promise<CctvDashboard> {
  const { data } = await apiClient.get<ApiResponse<CctvDashboard>>('/cctv/dashboard');
  return data.data;
}

export async function searchPermits(plateNumber: string): Promise<VehiclePermitSearchResult[]> {
  const { data } = await apiClient.get<ApiResponse<VehiclePermitSearchResult[]>>(
    '/cctv/permits/search',
    { params: { plateNumber } },
  );
  return data.data;
}

export async function listCameraRequests(
  params: ListCameraRequestsParams = {},
): Promise<PaginatedResponse<CameraRequest>> {
  const { data } = await apiClient.get<ApiResponse<CameraRequest[]> & { meta: PaginatedResponse<CameraRequest>['meta'] }>(
    '/cctv/requests',
    { params },
  );
  return { data: data.data, meta: data.meta };
}

export async function getCameraRequest(id: string): Promise<CameraRequest> {
  const { data } = await apiClient.get<ApiResponse<CameraRequest>>(`/cctv/requests/${id}`);
  return data.data;
}

export async function createCameraRequest(payload: CreateCameraRequestPayload): Promise<CameraRequest> {
  const { data } = await apiClient.post<ApiResponse<CameraRequest>>('/cctv/requests', payload);
  return data.data;
}

export async function startCameraRequest(id: string): Promise<CameraRequest> {
  const { data } = await apiClient.post<ApiResponse<CameraRequest>>(`/cctv/requests/${id}/start`);
  return data.data;
}

export async function completeCameraRequest(
  id: string,
  payload: CompleteCameraRequestPayload,
): Promise<CameraRequest> {
  const { data } = await apiClient.post<ApiResponse<CameraRequest>>(
    `/cctv/requests/${id}/complete`,
    payload,
  );
  return data.data;
}

export async function cancelCameraRequest(id: string): Promise<CameraRequest> {
  const { data } = await apiClient.post<ApiResponse<CameraRequest>>(`/cctv/requests/${id}/cancel`);
  return data.data;
}
