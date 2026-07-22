import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  ListVisitorsParams,
  PaginatedResponse,
  Visitor,
} from '../types/cctv';
import type {
  CreateVisitorPayload,
  VisitEmailIngestRecord,
  VisitHost,
} from '../types/visitIntake';

export const VISITORS_QUERY_KEYS = {
  list: (params?: ListVisitorsParams) => ['visitors', params] as const,
  hosts: (search?: string) => ['visitors', 'hosts', search] as const,
  emails: (parseStatus?: string) => ['visitors', 'emails', parseStatus] as const,
};

export async function listVisitors(
  params: ListVisitorsParams = {},
): Promise<PaginatedResponse<Visitor>> {
  const { data } = await apiClient.get<
    ApiResponse<Visitor[]> & { meta: PaginatedResponse<Visitor>['meta'] }
  >('/visitors', { params });
  return { data: data.data, meta: data.meta };
}

export async function createVisitor(payload: CreateVisitorPayload): Promise<Visitor> {
  const { data } = await apiClient.post<ApiResponse<Visitor>>('/visitors', payload);
  return data.data;
}

export async function listHosts(params: { search?: string } = {}): Promise<VisitHost[]> {
  const { data } = await apiClient.get<ApiResponse<VisitHost[]>>('/visitors/hosts', {
    params,
  });
  return data.data;
}

export async function listVisitEmails(
  parseStatus?: string,
): Promise<VisitEmailIngestRecord[]> {
  const { data } = await apiClient.get<ApiResponse<VisitEmailIngestRecord[]>>(
    '/visitors/emails',
    { params: parseStatus ? { parseStatus } : undefined },
  );
  return data.data;
}

export async function ingestVisitEmail(payload: {
  subject: string;
  body: string;
  senderEmail: string;
  receivedAt: string;
  visitorId?: string | null;
  rawHeaders?: unknown;
}): Promise<VisitEmailIngestRecord> {
  const { data } = await apiClient.post<ApiResponse<VisitEmailIngestRecord>>(
    '/visitors/emails/ingest',
    payload,
  );
  return data.data;
}
