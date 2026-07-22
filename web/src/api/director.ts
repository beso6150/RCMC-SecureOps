import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { DirectorDashboard } from '../types/director';

export const DIRECTOR_QUERY_KEYS = {
  dashboard: ['director', 'dashboard'] as const,
};

export async function fetchDirectorDashboard(): Promise<DirectorDashboard> {
  const { data } = await apiClient.get<ApiResponse<DirectorDashboard>>('/director/dashboard');
  return data.data;
}
