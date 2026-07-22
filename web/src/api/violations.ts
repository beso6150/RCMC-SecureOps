import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  ListViolationsParams,
  PaginatedResponse,
  Violation,
  ViolationAttachment,
} from '../types/cctv';

export const VIOLATIONS_QUERY_KEYS = {
  list: (params?: ListViolationsParams) => ['violations', params] as const,
  detail: (id: string) => ['violations', id] as const,
};

export interface ViolationAttachmentInput {
  fileName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  imagePath?: string | null;
  sortOrder?: number;
}

export interface UpdateViolationPayload {
  notes?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  imagePath?: string | null;
  status?: string;
  plateNumber?: string;
  violationType?: string;
  parkingCode?: string;
  vehicleColor?: string | null;
  ocrResult?: string | null;
  ocrConfidence?: number | null;
  arabicPlate?: string | null;
  englishPlate?: string | null;
}

export interface CreateViolationPayload {
  plateNumber: string;
  violationType: string;
  parkingCode: string;
  notes?: string | null;
  imagePath?: string | null;
  ocrResult?: string | null;
  ocrConfidence?: number | null;
  arabicPlate?: string | null;
  englishPlate?: string | null;
  vehicleColor?: string | null;
  clientSyncId?: string;
  detectedAt?: string;
  autoAssign?: boolean;
  attachments?: ViolationAttachmentInput[];
}

export async function listViolations(
  params: ListViolationsParams = {},
): Promise<PaginatedResponse<Violation>> {
  const { data } = await apiClient.get<ApiResponse<Violation[]> & { meta: PaginatedResponse<Violation>['meta'] }>(
    '/violations',
    { params },
  );
  return { data: data.data, meta: data.meta };
}

export async function getViolation(id: string): Promise<Violation> {
  const { data } = await apiClient.get<ApiResponse<Violation>>(`/violations/${id}`);
  return data.data;
}

export async function createViolation(payload: CreateViolationPayload): Promise<Violation> {
  const { data } = await apiClient.post<ApiResponse<Violation>>('/violations', payload);
  return data.data;
}

export async function assignViolation(
  id: string,
  body: { supervisorId?: string | null; cctvOperatorId?: string | null } = {},
): Promise<Violation> {
  const { data } = await apiClient.post<ApiResponse<Violation>>(`/violations/${id}/assign`, body);
  return data.data;
}

export async function startViolation(id: string): Promise<Violation> {
  const { data } = await apiClient.post<ApiResponse<Violation>>(`/violations/${id}/start`);
  return data.data;
}

export async function closeViolation(
  id: string,
  body: { notes?: string | null; status?: 'RESOLVED' | 'CANCELLED' } = {},
): Promise<Violation> {
  const { data } = await apiClient.post<ApiResponse<Violation>>(`/violations/${id}/close`, body);
  return data.data;
}

export async function updateViolation(
  id: string,
  body: UpdateViolationPayload,
): Promise<Violation> {
  const { data } = await apiClient.patch<ApiResponse<Violation>>(`/violations/${id}`, body);
  return data.data;
}

/** Links previously uploaded files to a violation (POST /violations/:id/attachments). */
export async function addViolationAttachments(
  id: string,
  attachments: ViolationAttachmentInput[],
): Promise<Violation> {
  const { data } = await apiClient.post<ApiResponse<Violation>>(`/violations/${id}/attachments`, {
    attachments,
  });
  return data.data;
}

export type { ViolationAttachment };
