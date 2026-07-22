import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';

export interface UploadBase64Payload {
  fileName: string;
  mimeType: string;
  contentBase64: string;
  folder?: string;
}

export interface UploadResult {
  storageKey: string;
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

/** Uploads a file as base64 via existing backend POST /uploads. */
export async function uploadBase64(payload: UploadBase64Payload): Promise<UploadResult> {
  const { data } = await apiClient.post<ApiResponse<UploadResult>>('/uploads', payload);
  return data.data;
}
