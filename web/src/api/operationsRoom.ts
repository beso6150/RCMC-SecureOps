import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type {
  CreateIncidentPayload,
  EmergencyProcedure,
  ListOpsIncidentsParams,
  OpsIncidentDetail,
  OpsIncidentListItem,
  OpsIncidentType,
  OpsRoomDashboard,
  OpsRoomStatistics,
  PaginatedOpsResponse,
} from '../types/operationsRoom';

const BASE = '/incidents';

export const OPS_ROOM_QUERY_KEYS = {
  all: ['operations-room'] as const,
  dashboard: ['operations-room', 'dashboard'] as const,
  live: (limit?: number) => ['operations-room', 'live', limit] as const,
  statistics: (from?: string, to?: string) =>
    ['operations-room', 'statistics', from, to] as const,
  procedures: (all?: boolean) => ['operations-room', 'procedures', all] as const,
  procedure: (id: string) => ['operations-room', 'procedures', id] as const,
  incidents: (params?: ListOpsIncidentsParams) => ['incidents', 'ops-list', params] as const,
  incident: (id: string) => ['incidents', 'ops-detail', id] as const,
  types: ['incidents', 'types'] as const,
  notes: (id: string) => ['incidents', id, 'notes'] as const,
  contacts: (id: string) => ['incidents', id, 'contacts'] as const,
  nearest: (id: string) => ['incidents', id, 'nearest'] as const,
  nearbyPatrols: (id: string) => ['incidents', id, 'nearby-patrols'] as const,
  linkedByReferral: (referralId: string) =>
    ['incidents', 'by-referral', referralId] as const,
};

export async function fetchOpsRoomDashboard(): Promise<OpsRoomDashboard> {
  const { data } = await apiClient.get<ApiResponse<OpsRoomDashboard>>(
    `${BASE}/operations-room/dashboard`,
  );
  return data.data;
}

export async function fetchOpsRoomLive(limit = 50): Promise<OpsIncidentListItem[]> {
  const { data } = await apiClient.get<ApiResponse<OpsIncidentListItem[]>>(
    `${BASE}/operations-room/live`,
    { params: { limit } },
  );
  return data.data;
}

export async function fetchOpsRoomStatistics(
  from?: string,
  to?: string,
): Promise<OpsRoomStatistics> {
  const { data } = await apiClient.get<ApiResponse<OpsRoomStatistics>>(
    `${BASE}/operations-room/statistics`,
    { params: { ...(from ? { from } : {}), ...(to ? { to } : {}) } },
  );
  return data.data;
}

export async function listOpsIncidents(
  params: ListOpsIncidentsParams = {},
): Promise<PaginatedOpsResponse<OpsIncidentListItem>> {
  const { data } = await apiClient.get<
    ApiResponse<OpsIncidentListItem[]> & { meta: PaginatedOpsResponse<OpsIncidentListItem>['meta'] }
  >(BASE, { params });
  return { data: data.data, meta: data.meta };
}

export async function getOpsIncident(id: string): Promise<OpsIncidentDetail> {
  const { data } = await apiClient.get<ApiResponse<OpsIncidentDetail>>(`${BASE}/${id}`);
  return data.data;
}

export async function createOpsIncident(
  payload: CreateIncidentPayload,
): Promise<OpsIncidentDetail> {
  const { data } = await apiClient.post<ApiResponse<OpsIncidentDetail>>(BASE, payload);
  return data.data;
}

export async function listIncidentTypes(): Promise<OpsIncidentType[]> {
  const { data } = await apiClient.get<ApiResponse<OpsIncidentType[]>>(`${BASE}/types`);
  return data.data;
}

export async function findIncidentByReferral(
  referralId: string,
): Promise<OpsIncidentListItem | null> {
  const result = await listOpsIncidents({ pageSize: 100 });
  return result.data.find((row) => row.relatedReferralId === referralId) ?? null;
}

export async function convertFromReferral(
  referralId: string,
  force = false,
): Promise<OpsIncidentDetail> {
  const { data } = await apiClient.post<ApiResponse<OpsIncidentDetail>>(
    `${BASE}/from-referral/${referralId}`,
    { force },
  );
  return data.data;
}

export async function convertFromFieldAlert(
  alertId: string,
  force = false,
): Promise<OpsIncidentDetail> {
  const { data } = await apiClient.post<ApiResponse<OpsIncidentDetail>>(
    `${BASE}/from-field-alert/${alertId}`,
    { force },
  );
  return data.data;
}

export async function convertFromViolation(
  violationId: string,
  force = false,
): Promise<OpsIncidentDetail> {
  const { data } = await apiClient.post<ApiResponse<OpsIncidentDetail>>(
    `${BASE}/from-violation/${violationId}`,
    { force },
  );
  return data.data;
}

async function postLifecycle(
  id: string,
  action: string,
  body?: Record<string, unknown>,
): Promise<OpsIncidentDetail> {
  const { data } = await apiClient.post<ApiResponse<OpsIncidentDetail>>(
    `${BASE}/${id}/${action}`,
    body ?? {},
  );
  return data.data;
}

export const acknowledgeIncident = (id: string) => postLifecycle(id, 'acknowledge');
export const assessIncident = (id: string, body: Record<string, unknown> = {}) =>
  postLifecycle(id, 'assess', body);
export const assignOpsIncident = (id: string, body: Record<string, unknown>) =>
  postLifecycle(id, 'assign-ops', body);
export const reassignIncident = (id: string, body: Record<string, unknown>) =>
  postLifecycle(id, 'reassign', body);
export const respondIncident = (id: string) => postLifecycle(id, 'respond');
export const arriveIncident = (id: string) => postLifecycle(id, 'arrive');
export const containIncident = (id: string) => postLifecycle(id, 'contain');
export const resolveOpsIncident = (id: string, body: Record<string, unknown> = {}) =>
  postLifecycle(id, 'resolve', body);
export const reopenIncident = (id: string, body: Record<string, unknown> = {}) =>
  postLifecycle(id, 'reopen', body);
export const falseAlarmIncident = (id: string, body: { reason: string }) =>
  postLifecycle(id, 'false-alarm', body);
export const escalateIncident = (id: string, body: Record<string, unknown> = {}) =>
  postLifecycle(id, 'escalate', body);
export const requestSupportIncident = (id: string, body: Record<string, unknown> = {}) =>
  postLifecycle(id, 'request-support', body);
export const closeOpsIncident = (id: string, body: Record<string, unknown> = {}) =>
  postLifecycle(id, 'close', body);
export const cancelOpsIncident = (id: string, body: Record<string, unknown> = {}) =>
  postLifecycle(id, 'cancel', body);

export async function addIncidentNote(
  id: string,
  body: { content: string; noteType?: string; visibility?: string },
) {
  const { data } = await apiClient.post(`${BASE}/${id}/notes`, body);
  return data.data;
}

export async function listIncidentNotes(id: string) {
  const { data } = await apiClient.get(`${BASE}/${id}/notes`);
  return data.data;
}

export async function addIncidentContact(id: string, body: Record<string, unknown>) {
  const { data } = await apiClient.post(`${BASE}/${id}/contacts`, body);
  return data.data;
}

export async function listIncidentContacts(id: string) {
  const { data } = await apiClient.get(`${BASE}/${id}/contacts`);
  return data.data;
}

export async function addIncidentTask(id: string, body: Record<string, unknown>) {
  const { data } = await apiClient.post(`${BASE}/${id}/tasks`, body);
  return data.data;
}

export async function completeIncidentTask(
  id: string,
  taskId: string,
  body: Record<string, unknown> = {},
) {
  const { data } = await apiClient.post(`${BASE}/${id}/tasks/${taskId}/complete`, body);
  return data.data;
}

export async function addIncidentFollowUp(id: string, body: Record<string, unknown>) {
  const { data } = await apiClient.post(`${BASE}/${id}/follow-ups`, body);
  return data.data;
}

export async function completeIncidentFollowUp(
  id: string,
  followUpId: string,
  body: Record<string, unknown> = {},
) {
  const { data } = await apiClient.post(
    `${BASE}/${id}/follow-ups/${followUpId}/complete`,
    body,
  );
  return data.data;
}

export async function uploadIncidentAttachment(
  id: string,
  body: {
    originalFileName: string;
    mimeType: string;
    contentBase64: string;
    description?: string | null;
  },
) {
  const { data } = await apiClient.post(`${BASE}/${id}/attachments/upload`, body);
  return data.data;
}

export async function downloadIncidentAttachment(
  id: string,
  attachmentId: string,
): Promise<Blob> {
  const { data } = await apiClient.get(`${BASE}/${id}/attachments/${attachmentId}/download`, {
    responseType: 'blob',
  });
  return data;
}

export async function previewIncidentAttachment(
  id: string,
  attachmentId: string,
): Promise<Blob> {
  const { data } = await apiClient.get(`${BASE}/${id}/attachments/${attachmentId}/preview`, {
    responseType: 'blob',
  });
  return data;
}

export async function fetchNearestPersonnel(id: string) {
  const { data } = await apiClient.get(`${BASE}/${id}/nearest-personnel`);
  return data.data;
}

export async function fetchNearbyPatrols(id: string) {
  const { data } = await apiClient.get(`${BASE}/${id}/nearby-patrols`);
  return data.data;
}

export async function listEmergencyProcedures(all = false): Promise<EmergencyProcedure[]> {
  const { data } = await apiClient.get<ApiResponse<EmergencyProcedure[]>>(
    `${BASE}/emergency-procedures`,
    { params: all ? { all: 'true' } : undefined },
  );
  return data.data;
}

export async function getEmergencyProcedure(id: string): Promise<EmergencyProcedure> {
  const { data } = await apiClient.get<ApiResponse<EmergencyProcedure>>(
    `${BASE}/emergency-procedures/${id}`,
  );
  return data.data;
}

export async function createEmergencyProcedure(
  body: Omit<EmergencyProcedure, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<EmergencyProcedure> {
  const { data } = await apiClient.post<ApiResponse<EmergencyProcedure>>(
    `${BASE}/emergency-procedures`,
    body,
  );
  return data.data;
}

export async function updateEmergencyProcedure(
  id: string,
  body: Partial<EmergencyProcedure>,
): Promise<EmergencyProcedure> {
  const { data } = await apiClient.patch<ApiResponse<EmergencyProcedure>>(
    `${BASE}/emergency-procedures/${id}`,
    body,
  );
  return data.data;
}

export async function setEmergencyProcedureActive(
  id: string,
  isActive: boolean,
): Promise<EmergencyProcedure> {
  return updateEmergencyProcedure(id, { isActive });
}

export async function deleteEmergencyProcedure(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/emergency-procedures/${id}`);
}

export async function applyEmergencyProcedure(incidentId: string, procedureId: string) {
  const { data } = await apiClient.post(`${BASE}/${incidentId}/apply-procedure`, {
    procedureId,
  });
  return data.data;
}

export async function completeProcedureStep(
  incidentId: string,
  stepId: string,
  notes?: string | null,
) {
  const { data } = await apiClient.post(
    `${BASE}/${incidentId}/procedure-steps/${stepId}/complete`,
    { notes },
  );
  return data.data;
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
