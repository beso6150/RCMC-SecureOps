import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  AuditLogEntry,
  AuditLogStatistics,
  AuditLogsListParams,
  PaginatedAuditLogs,
} from '../types/auditLogs';

const BASE = '/audit-logs';

export const AUDIT_LOGS_QUERY_KEYS = {
  all: ['audit-logs'] as const,
  list: (params?: AuditLogsListParams) => ['audit-logs', 'list', params] as const,
  detail: (id: string) => ['audit-logs', 'detail', id] as const,
  statistics: (params?: Pick<AuditLogsListParams, 'from' | 'to' | 'module'>) =>
    ['audit-logs', 'statistics', params] as const,
};

export async function fetchAuditLogs(
  params: AuditLogsListParams = {},
): Promise<PaginatedAuditLogs> {
  const query: Record<string, string | number | boolean | undefined> = { ...params };
  if (params.success !== undefined) {
    query.success = params.success ? 'true' : 'false';
  }
  const { data } = await apiClient.get<ApiResponse<AuditLogEntry[]> & PaginatedAuditLogs>(BASE, {
    params: query,
  });
  return { data: data.data, meta: data.meta };
}

export async function fetchAuditLog(id: string): Promise<AuditLogEntry> {
  const { data } = await apiClient.get<ApiResponse<AuditLogEntry>>(`${BASE}/${id}`);
  return data.data;
}

export async function fetchAuditLogStatistics(
  params: Pick<AuditLogsListParams, 'from' | 'to' | 'module'> = {},
): Promise<AuditLogStatistics> {
  const { data } = await apiClient.get<ApiResponse<AuditLogStatistics>>(`${BASE}/statistics`, {
    params,
  });
  return data.data;
}

export async function exportAuditLogs(params: AuditLogsListParams = {}): Promise<Blob> {
  const { data } = await apiClient.post<Blob>(`${BASE}/export`, params, {
    responseType: 'blob',
  });
  return data;
}
