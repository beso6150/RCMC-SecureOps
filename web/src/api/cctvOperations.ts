import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  CreatePermitPayload,
  CreateReferralPayload,
  CctvOpsDashboard,
  CctvOpsStatistics,
  CctvUserBrief,
  FileAttachmentPayload,
  ListParams,
  PaginatedResponse,
  PermitShare,
  ResolveReferralPayload,
  SecurityPermit,
  SecurityReferral,
  ReferralAttachment,
  ReferralUpdate,
} from '../types/cctvOperations';

const BASE = '/cctv-operations';

export const CCTV_OPS_QUERY_KEYS = {
  all: ['cctv-operations'] as const,
  dashboard: ['cctv-operations', 'dashboard'] as const,
  activePersonnel: ['cctv-operations', 'active-personnel'] as const,
  currentShift: ['cctv-operations', 'current-shift'] as const,
  permits: (params?: ListParams) => ['cctv-operations', 'permits', params] as const,
  permit: (id: string) => ['cctv-operations', 'permits', id] as const,
  permitShares: (id: string) => ['cctv-operations', 'permits', id, 'shares'] as const,
  referrals: (params?: ListParams) => ['cctv-operations', 'referrals', params] as const,
  referral: (id: string) => ['cctv-operations', 'referrals', id] as const,
  referralTimeline: (id: string) =>
    ['cctv-operations', 'referrals', id, 'timeline'] as const,
  followUp: (params?: ListParams) => ['cctv-operations', 'follow-up', params] as const,
  inbox: (params?: ListParams) => ['cctv-operations', 'inbox', params] as const,
  statistics: (from?: string, to?: string) =>
    ['cctv-operations', 'statistics', from, to] as const,
};

interface BackendRows<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

function toPage<T>(raw: BackendRows<T>): PaginatedResponse<T> {
  return {
    data: raw.rows,
    meta: { page: raw.page, pageSize: raw.pageSize, total: raw.total },
  };
}

function toRecord(
  items: Array<{ count: number } & Record<string, string>> | undefined,
  key: string,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items ?? []) {
    const k = item[key];
    if (k) out[k] = item.count;
  }
  return out;
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export async function fileToBase64Payload(file: File): Promise<FileAttachmentPayload> {
  return {
    originalFileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    contentBase64: await fileToBase64(file),
  };
}

export async function fetchCctvOpsDashboard(): Promise<CctvOpsDashboard> {
  const { data } = await apiClient.get<
    ApiResponse<{
      cards: {
        activePermitsToday: number;
        newPermits: number;
        unackedShares: number;
        newReferrals: number;
        sentReferrals: number;
        receivedReferrals: number;
        inProgressReferrals: number;
        delayedReferrals: number;
        criticalReferrals: number;
        resolvedToday: number;
      };
      openReferrals: SecurityReferral[];
      delayedReferrals: SecurityReferral[];
      recentPermits: SecurityPermit[];
      recentReferrals: SecurityReferral[];
      availablePersonnel?: CctvUserBrief[];
      workingGroup?: CctvOpsDashboard['workingGroup'];
      currentShift?: CctvOpsDashboard['currentShift'];
    }>
  >(`${BASE}/dashboard`);

  const d = data.data;
  const openList = d.openReferrals ?? [];
  return {
    activePermits: d.cards.activePermitsToday,
    draftPermits: d.cards.newPermits,
    sharedPermitsToday: d.cards.unackedShares,
    openReferrals: openList.length,
    sentReferrals: d.cards.sentReferrals,
    inProgressReferrals: d.cards.inProgressReferrals,
    escalatedReferrals: d.delayedReferrals?.filter((r) => r.status === 'ESCALATED').length ?? 0,
    resolvedToday: d.cards.resolvedToday,
    needsFollowUp: openList.filter((r) => r.needsFollowUp).length,
    criticalOpen: d.cards.criticalReferrals,
    recentReferrals: d.recentReferrals ?? [],
    recentPermits: d.recentPermits,
    delayedReferrals: d.delayedReferrals,
    availablePersonnel: d.availablePersonnel,
    workingGroup: d.workingGroup,
    currentShift: d.currentShift,
  };
}

export async function fetchActivePersonnel(): Promise<CctvUserBrief[]> {
  const { data } = await apiClient.get<ApiResponse<CctvUserBrief[]>>(`${BASE}/active-personnel`);
  return data.data;
}

export async function fetchCurrentShift(): Promise<unknown> {
  const { data } = await apiClient.get<ApiResponse<unknown>>(`${BASE}/current-shift`);
  return data.data;
}

export async function listPermits(params: ListParams = {}): Promise<PaginatedResponse<SecurityPermit>> {
  const { data } = await apiClient.get<ApiResponse<BackendRows<SecurityPermit>>>(`${BASE}/permits`, {
    params,
  });
  return toPage(data.data);
}

export async function getPermit(id: string): Promise<SecurityPermit> {
  const { data } = await apiClient.get<ApiResponse<SecurityPermit>>(`${BASE}/permits/${id}`);
  return data.data;
}

export async function createPermit(payload: CreatePermitPayload): Promise<SecurityPermit> {
  const { data } = await apiClient.post<ApiResponse<SecurityPermit>>(`${BASE}/permits`, payload);
  return data.data;
}

export async function updatePermit(
  id: string,
  payload: Partial<CreatePermitPayload>,
): Promise<SecurityPermit> {
  const { data } = await apiClient.patch<ApiResponse<SecurityPermit>>(
    `${BASE}/permits/${id}`,
    payload,
  );
  return data.data;
}

export async function activatePermit(id: string): Promise<SecurityPermit> {
  const { data } = await apiClient.post<ApiResponse<SecurityPermit>>(
    `${BASE}/permits/${id}/activate`,
  );
  return data.data;
}

export async function cancelPermit(
  id: string,
  payload: string | { cancelReason?: string | null; reason?: string },
): Promise<SecurityPermit> {
  const reason =
    typeof payload === 'string' ? payload : (payload.cancelReason ?? payload.reason ?? '');
  const { data } = await apiClient.post<ApiResponse<SecurityPermit>>(
    `${BASE}/permits/${id}/cancel`,
    { reason },
  );
  return data.data;
}

export async function rejectPermit(
  id: string,
  payload: string | { rejectReason?: string; reason?: string },
): Promise<SecurityPermit> {
  const reason =
    typeof payload === 'string' ? payload : (payload.rejectReason ?? payload.reason ?? '');
  const { data } = await apiClient.post<ApiResponse<SecurityPermit>>(
    `${BASE}/permits/${id}/reject`,
    { reason },
  );
  return data.data;
}

export async function markPermitUsed(id: string): Promise<SecurityPermit> {
  const { data } = await apiClient.post<ApiResponse<SecurityPermit>>(
    `${BASE}/permits/${id}/mark-used`,
  );
  return data.data;
}

export async function sharePermit(
  id: string,
  payload: {
    sharedWithUserId?: string | null;
    sharedWithGroupId?: string | null;
    sharedWithRole?: string | null;
    message?: string | null;
  },
): Promise<PermitShare> {
  const { data } = await apiClient.post<ApiResponse<PermitShare>>(
    `${BASE}/permits/${id}/share`,
    payload,
  );
  return data.data;
}

export async function listPermitShares(id: string): Promise<PermitShare[]> {
  const permit = await getPermit(id);
  return permit.shares ?? [];
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Acknowledge share for the current permit (pass permitId). */
export async function acknowledgePermitShare(
  permitId: string,
  mode: 'view' | 'acknowledge' = 'acknowledge',
): Promise<PermitShare> {
  const { data } = await apiClient.post<ApiResponse<PermitShare>>(
    `${BASE}/permits/${permitId}/acknowledge`,
    { mode },
  );
  return data.data;
}

export async function acknowledgePermit(
  id: string,
  mode: 'view' | 'acknowledge' = 'acknowledge',
): Promise<PermitShare> {
  return acknowledgePermitShare(id, mode);
}

export async function downloadPermitAttachment(id: string): Promise<Blob> {
  const { data } = await apiClient.get(`${BASE}/permits/${id}/attachment`, {
    responseType: 'blob',
  });
  return data as Blob;
}

export async function previewPermitAttachment(id: string): Promise<Blob> {
  return downloadPermitAttachment(id);
}

export async function listReferrals(
  params: ListParams = {},
): Promise<PaginatedResponse<SecurityReferral>> {
  const { needsFollowUp, ...rest } = params;
  const { data } = await apiClient.get<ApiResponse<BackendRows<SecurityReferral>>>(
    `${BASE}/referrals`,
    { params: rest },
  );
  const page = toPage(data.data);
  if (needsFollowUp) {
    const filtered = page.data.filter((r) => r.needsFollowUp);
    return {
      data: filtered,
      meta: { ...page.meta, total: filtered.length },
    };
  }
  return page;
}

export async function listFollowUpReferrals(
  params: ListParams = {},
): Promise<PaginatedResponse<SecurityReferral>> {
  const [sent, inProgress, escalated, resolved] = await Promise.all([
    listReferrals({ ...params, status: 'SENT' }),
    listReferrals({ ...params, status: 'IN_PROGRESS' }),
    listReferrals({ ...params, status: 'ESCALATED' }),
    listReferrals({ ...params, status: 'RESOLVED', needsFollowUp: true }),
  ]);
  const data = [...sent.data, ...inProgress.data, ...escalated.data, ...resolved.data];
  return { data, meta: { page: 1, pageSize: data.length, total: data.length } };
}

export async function listAssignedReferralsInbox(
  params: ListParams = {},
): Promise<PaginatedResponse<SecurityReferral>> {
  const [sent, received, inProgress, escalated] = await Promise.all([
    listReferrals({ ...params, status: 'SENT' }),
    listReferrals({ ...params, status: 'RECEIVED' }),
    listReferrals({ ...params, status: 'IN_PROGRESS' }),
    listReferrals({ ...params, status: 'ESCALATED' }),
  ]);
  const data = [...sent.data, ...received.data, ...inProgress.data, ...escalated.data];
  return { data, meta: { page: 1, pageSize: data.length, total: data.length } };
}

export async function getReferral(id: string): Promise<SecurityReferral> {
  const { data } = await apiClient.get<ApiResponse<SecurityReferral>>(`${BASE}/referrals/${id}`);
  return data.data;
}

export async function createReferral(payload: CreateReferralPayload): Promise<SecurityReferral> {
  const { data } = await apiClient.post<ApiResponse<SecurityReferral>>(
    `${BASE}/referrals`,
    payload,
  );
  return data.data;
}

export async function sendReferral(id: string): Promise<SecurityReferral> {
  const { data } = await apiClient.post<ApiResponse<SecurityReferral>>(
    `${BASE}/referrals/${id}/send`,
  );
  return data.data;
}

export async function assignReferral(
  id: string,
  assignedUserId: string,
  message?: string,
): Promise<SecurityReferral> {
  const { data } = await apiClient.post<ApiResponse<SecurityReferral>>(
    `${BASE}/referrals/${id}/assign`,
    { assignedUserId, message },
  );
  return data.data;
}

export async function receiveReferral(id: string): Promise<SecurityReferral> {
  const { data } = await apiClient.post<ApiResponse<SecurityReferral>>(
    `${BASE}/referrals/${id}/receive`,
  );
  return data.data;
}

export async function startReferral(id: string): Promise<SecurityReferral> {
  const { data } = await apiClient.post<ApiResponse<SecurityReferral>>(
    `${BASE}/referrals/${id}/start`,
  );
  return data.data;
}

export async function arriveReferral(id: string): Promise<SecurityReferral> {
  const { data } = await apiClient.post<ApiResponse<SecurityReferral>>(
    `${BASE}/referrals/${id}/arrive`,
  );
  return data.data;
}

export async function resolveReferral(
  id: string,
  payload: ResolveReferralPayload,
): Promise<SecurityReferral> {
  const { data } = await apiClient.post<ApiResponse<SecurityReferral>>(
    `${BASE}/referrals/${id}/resolve`,
    payload,
  );
  return data.data;
}

export async function rejectReferral(
  id: string,
  payload: string | { rejectionReason?: string; reason?: string },
): Promise<SecurityReferral> {
  const reason =
    typeof payload === 'string' ? payload : (payload.rejectionReason ?? payload.reason ?? '');
  const { data } = await apiClient.post<ApiResponse<SecurityReferral>>(
    `${BASE}/referrals/${id}/reject`,
    { reason },
  );
  return data.data;
}

export async function cancelReferral(
  id: string,
  payload: string | { cancellationReason?: string | null; reason?: string | null },
): Promise<SecurityReferral> {
  const reason =
    typeof payload === 'string' ? payload : (payload.cancellationReason ?? payload.reason ?? '');
  const { data } = await apiClient.post<ApiResponse<SecurityReferral>>(
    `${BASE}/referrals/${id}/cancel`,
    { reason },
  );
  return data.data;
}

export async function escalateReferral(
  id: string,
  payload: string | { escalationReason?: string; reason?: string; level?: number },
  level?: number,
): Promise<SecurityReferral> {
  const reason =
    typeof payload === 'string' ? payload : (payload.escalationReason ?? payload.reason ?? '');
  const lvl = typeof payload === 'string' ? level : (payload.level ?? level);
  const { data } = await apiClient.post<ApiResponse<SecurityReferral>>(
    `${BASE}/referrals/${id}/escalate`,
    { reason, level: lvl },
  );
  return data.data;
}

export async function closeReferral(id: string, note?: string | null): Promise<SecurityReferral> {
  const { data } = await apiClient.post<ApiResponse<SecurityReferral>>(
    `${BASE}/referrals/${id}/close`,
    { note },
  );
  return data.data;
}

export async function addReferralNote(
  id: string,
  payload: string | { message: string },
): Promise<SecurityReferral> {
  const message = typeof payload === 'string' ? payload : payload.message;
  const { data } = await apiClient.post<ApiResponse<SecurityReferral>>(
    `${BASE}/referrals/${id}/notes`,
    { message },
  );
  return data.data;
}

export async function uploadReferralAttachment(
  id: string,
  payload: FileAttachmentPayload,
): Promise<ReferralAttachment> {
  const { data } = await apiClient.post<ApiResponse<ReferralAttachment>>(
    `${BASE}/referrals/${id}/attachments`,
    payload,
  );
  return data.data;
}

export const addReferralAttachment = uploadReferralAttachment;

export async function fetchReferralTimeline(id: string): Promise<ReferralUpdate[]> {
  const { data } = await apiClient.get<ApiResponse<ReferralUpdate[]>>(
    `${BASE}/referrals/${id}/timeline`,
  );
  return data.data;
}

export async function downloadReferralAttachment(
  referralId: string,
  attachmentId: string,
): Promise<Blob> {
  const { data } = await apiClient.get(
    `${BASE}/referrals/${referralId}/attachments/${attachmentId}/download`,
    { responseType: 'blob' },
  );
  return data as Blob;
}

export async function previewReferralAttachment(
  referralId: string,
  attachmentId: string,
): Promise<Blob> {
  const { data } = await apiClient.get(
    `${BASE}/referrals/${referralId}/attachments/${attachmentId}/preview`,
    { responseType: 'blob' },
  );
  return data as Blob;
}

export async function fetchCctvOpsStatistics(
  from?: string,
  to?: string,
): Promise<CctvOpsStatistics> {
  const [permits, referrals] = await Promise.all([
    apiClient.get<
      ApiResponse<{
        total: number;
        byStatus: Array<{ status: string; count: number }>;
        averageAcknowledgeMinutes: number | null;
      }>
    >(`${BASE}/permits/statistics`, { params: { from, to } }),
    apiClient.get<
      ApiResponse<{
        total: number;
        byStatus: Array<{ status: string; count: number }>;
        bySeverity: Array<{ severity: string; count: number }>;
        averageReceiveMinutes: number | null;
        averageResolveMinutes: number | null;
        closedRate: number | null;
        escalatedRate: number | null;
      }>
    >(`${BASE}/referrals/statistics`, { params: { from, to } }),
  ]);

  return {
    permitsByStatus: toRecord(permits.data.data.byStatus as never, 'status'),
    referralsByStatus: toRecord(referrals.data.data.byStatus as never, 'status'),
    referralsBySeverity: toRecord(referrals.data.data.bySeverity as never, 'severity'),
    totalPermits: permits.data.data.total,
    totalReferrals: referrals.data.data.total,
    averageAcknowledgeMinutes: permits.data.data.averageAcknowledgeMinutes,
    averageReceiveMinutes: referrals.data.data.averageReceiveMinutes,
    averageResolveMinutes: referrals.data.data.averageResolveMinutes,
    closedRate: referrals.data.data.closedRate,
    escalatedRate: referrals.data.data.escalatedRate,
    escalationCount: Math.round(
      ((referrals.data.data.escalatedRate ?? 0) / 100) * (referrals.data.data.total || 0),
    ),
  };
}
