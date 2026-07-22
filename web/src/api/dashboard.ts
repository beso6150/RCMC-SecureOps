import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { DashboardSummary } from '../types/dashboard';

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<ApiResponse<DashboardSummary>>('/dashboard/summary');
  return data.data;
}
