import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  ApprovalNotesPayload,
  CustomReportPayload,
  GenerateReportPayload,
  KpiOverview,
  KpiQuery,
  RejectNotesPayload,
  ReportPeriod,
  ReportSchedule,
  ReportsDashboard,
  SavedReport,
  SavedReportsListParams,
  PaginatedReports,
  SchedulePayload,
} from '../types/reportsCenter';

const BASE = '/reports';

export const REPORTS_CENTER_QUERY_KEYS = {
  all: ['reports-center'] as const,
  dashboard: (period?: ReportPeriod) => ['reports-center', 'dashboard', period] as const,
  kpi: (params?: KpiQuery) => ['reports-center', 'kpi', params] as const,
  saved: (params?: SavedReportsListParams) => ['reports-center', 'saved', params] as const,
  savedDetail: (id: string) => ['reports-center', 'saved', id] as const,
  schedules: ['reports-center', 'schedules'] as const,
  schedule: (id: string) => ['reports-center', 'schedules', id] as const,
};

export async function fetchReportsDashboard(
  period: ReportPeriod = 'daily',
): Promise<ReportsDashboard> {
  const { data } = await apiClient.get<ApiResponse<ReportsDashboard>>(`${BASE}/dashboard`, {
    params: { period },
  });
  return data.data;
}

export async function fetchKpiOverview(params: KpiQuery): Promise<KpiOverview> {
  const { data } = await apiClient.get<ApiResponse<KpiOverview>>(`${BASE}/kpi`, {
    params,
  });
  return data.data;
}

export async function fetchSavedReports(
  params: SavedReportsListParams = {},
): Promise<PaginatedReports> {
  const { data } = await apiClient.get<ApiResponse<SavedReport[]> & PaginatedReports>(BASE, {
    params,
  });
  return { data: data.data, meta: data.meta };
}

export async function fetchSavedReport(id: string): Promise<SavedReport> {
  const { data } = await apiClient.get<ApiResponse<SavedReport>>(`${BASE}/${id}`);
  return data.data;
}

export async function generateReport(payload: GenerateReportPayload): Promise<SavedReport> {
  const { data } = await apiClient.post<ApiResponse<SavedReport>>(`${BASE}/generate`, payload);
  return data.data;
}

export async function generateDailyReport(
  payload: Omit<GenerateReportPayload, 'reportType'>,
): Promise<SavedReport> {
  const { data } = await apiClient.post<ApiResponse<SavedReport>>(
    `${BASE}/generate/daily`,
    payload,
  );
  return data.data;
}

export async function generateShiftReport(payload: GenerateReportPayload): Promise<SavedReport> {
  const { data } = await apiClient.post<ApiResponse<SavedReport>>(
    `${BASE}/generate/shift`,
    payload,
  );
  return data.data;
}

export async function generateCustomReport(payload: CustomReportPayload): Promise<SavedReport> {
  const { data } = await apiClient.post<ApiResponse<SavedReport>>(`${BASE}/custom`, payload);
  return data.data;
}

export async function submitReport(
  id: string,
  payload: ApprovalNotesPayload = {},
): Promise<SavedReport> {
  const { data } = await apiClient.post<ApiResponse<SavedReport>>(
    `${BASE}/${id}/submit`,
    payload,
  );
  return data.data;
}

export async function approveReport(
  id: string,
  payload: ApprovalNotesPayload = {},
): Promise<SavedReport> {
  const { data } = await apiClient.post<ApiResponse<SavedReport>>(
    `${BASE}/${id}/approve`,
    payload,
  );
  return data.data;
}

export async function rejectReport(id: string, payload: RejectNotesPayload): Promise<SavedReport> {
  const { data } = await apiClient.post<ApiResponse<SavedReport>>(
    `${BASE}/${id}/reject`,
    payload,
  );
  return data.data;
}

export async function returnReport(
  id: string,
  payload: ApprovalNotesPayload = {},
): Promise<SavedReport> {
  const { data } = await apiClient.post<ApiResponse<SavedReport>>(
    `${BASE}/${id}/return`,
    payload,
  );
  return data.data;
}

export async function archiveReport(
  id: string,
  payload: ApprovalNotesPayload = {},
): Promise<SavedReport> {
  const { data } = await apiClient.post<ApiResponse<SavedReport>>(
    `${BASE}/${id}/archive`,
    payload,
  );
  return data.data;
}

export async function createReportVersion(id: string): Promise<SavedReport> {
  const { data } = await apiClient.post<ApiResponse<SavedReport>>(`${BASE}/${id}/versions`);
  return data.data;
}

export async function softDeleteSavedReport(id: string): Promise<{ id: string }> {
  const { data } = await apiClient.delete<ApiResponse<{ id: string }>>(`${BASE}/${id}`);
  return data.data;
}

export async function exportSavedReportPdf(id: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`${BASE}/${id}/pdf`, {
    responseType: 'blob',
  });
  return data;
}

export async function exportSavedReportCsv(id: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`${BASE}/${id}/csv`, {
    responseType: 'blob',
  });
  return data;
}

export async function fetchReportSchedules(): Promise<ReportSchedule[]> {
  const { data } = await apiClient.get<ApiResponse<ReportSchedule[]>>(`${BASE}/schedules`);
  return data.data;
}

export async function fetchReportSchedule(id: string): Promise<ReportSchedule> {
  const { data } = await apiClient.get<ApiResponse<ReportSchedule>>(`${BASE}/schedules/${id}`);
  return data.data;
}

export async function createReportSchedule(payload: SchedulePayload): Promise<ReportSchedule> {
  const { data } = await apiClient.post<ApiResponse<ReportSchedule>>(
    `${BASE}/schedules`,
    payload,
  );
  return data.data;
}

export async function updateReportSchedule(
  id: string,
  payload: Partial<SchedulePayload>,
): Promise<ReportSchedule> {
  const { data } = await apiClient.patch<ApiResponse<ReportSchedule>>(
    `${BASE}/schedules/${id}`,
    payload,
  );
  return data.data;
}

export async function enableReportSchedule(id: string): Promise<ReportSchedule> {
  const { data } = await apiClient.post<ApiResponse<ReportSchedule>>(
    `${BASE}/schedules/${id}/enable`,
  );
  return data.data;
}

export async function disableReportSchedule(id: string): Promise<ReportSchedule> {
  const { data } = await apiClient.post<ApiResponse<ReportSchedule>>(
    `${BASE}/schedules/${id}/disable`,
  );
  return data.data;
}

export async function runReportScheduleNow(id: string): Promise<ReportSchedule> {
  const { data } = await apiClient.post<ApiResponse<ReportSchedule>>(
    `${BASE}/schedules/${id}/run-now`,
  );
  return data.data;
}

export async function deleteReportSchedule(id: string): Promise<{ id: string }> {
  const { data } = await apiClient.delete<ApiResponse<{ id: string }>>(
    `${BASE}/schedules/${id}`,
  );
  return data.data;
}

export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function defaultDateRange(daysBack = 1): { dateFrom: string; dateTo: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - daysBack);
  from.setHours(0, 0, 0, 0);
  return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
}

export function todayRange(): { dateFrom: string; dateTo: string } {
  const to = new Date();
  const from = new Date(to);
  from.setHours(0, 0, 0, 0);
  return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
}

export function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function fromDateInputValue(value: string, endOfDay = false): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
