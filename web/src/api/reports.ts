import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { ReportPeriod, ReportSummary } from '../types/director';

export const REPORTS_QUERY_KEYS = {
  summary: (period?: ReportPeriod) => ['reports', 'summary', period] as const,
};

export async function fetchReportSummary(period: ReportPeriod = 'daily'): Promise<ReportSummary> {
  const { data } = await apiClient.get<ApiResponse<ReportSummary>>('/reports/summary', {
    params: { period },
  });
  return data.data;
}

export async function exportReport(
  period: ReportPeriod,
  format: 'pdf' | 'csv',
): Promise<Blob> {
  const { data } = await apiClient.get<Blob>('/reports/export', {
    params: { period, format },
    responseType: 'blob',
  });
  return data;
}
