import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { PaginatedResponse } from '../types/cctv';
import type {
  AssignPatrolPayload,
  CancelPatrolPayload,
  CreateCheckpointPayload,
  CreateFieldAlertPayload,
  CreatePatrolRoutePayload,
  CreatePatrolSessionPayload,
  CreateZonePayload,
  FieldAlert,
  FieldMapFilters,
  FieldMapSnapshot,
  FieldOpsOverview,
  FieldOpsStatistics,
  ListParams,
  NearestPersonnelResult,
  PatrolRoute,
  PatrolSession,
  PatrolCheckpointVisit,
  PersonnelLocation,
  RecordPatrolVisitPayload,
  ResolveAlertPayload,
  SecurityCheckpoint,
  SecurityZone,
  SosAlertPayload,
  UpdateCheckpointPayload,
  UpdatePatrolRoutePayload,
  UpdatePersonnelLocationPayload,
  UpdateZonePayload,
} from '../types/fieldOperations';

const BASE = '/field-operations';

export const FIELD_OPS_QUERY_KEYS = {
  all: ['field-operations'] as const,
  overview: ['field-operations', 'overview'] as const,
  map: (filters?: FieldMapFilters) => ['field-operations', 'map', filters] as const,
  statistics: (from?: string, to?: string) =>
    ['field-operations', 'statistics', from, to] as const,
  zones: (params?: ListParams) => ['field-operations', 'zones', params] as const,
  zone: (id: string) => ['field-operations', 'zones', id] as const,
  checkpoints: (params?: ListParams) => ['field-operations', 'checkpoints', params] as const,
  checkpoint: (id: string) => ['field-operations', 'checkpoints', id] as const,
  routes: (params?: ListParams) => ['field-operations', 'patrol-routes', params] as const,
  route: (id: string) => ['field-operations', 'patrol-routes', id] as const,
  patrols: (params?: ListParams) => ['field-operations', 'patrol-sessions', params] as const,
  patrol: (id: string) => ['field-operations', 'patrol-sessions', id] as const,
  personnel: (params?: ListParams) =>
    ['field-operations', 'personnel-locations', params] as const,
  alerts: (params?: ListParams) => ['field-operations', 'alerts', params] as const,
  alert: (id: string) => ['field-operations', 'alerts', id] as const,
  nearestPersonnel: (mapX?: number, mapY?: number) =>
    ['field-operations', 'nearest-personnel', mapX, mapY] as const,
};

function unwrapList<T>(
  data: ApiResponse<T[]> & { meta?: PaginatedResponse<T>['meta'] },
): PaginatedResponse<T> {
  return {
    data: data.data,
    meta: data.meta ?? { page: 1, pageSize: data.data.length, total: data.data.length },
  };
}

// ── Overview / Map / Statistics ─────────────────────────────────

export async function fetchFieldOpsOverview(): Promise<FieldOpsOverview> {
  const { data } = await apiClient.get<ApiResponse<FieldOpsOverview>>(`${BASE}/overview`);
  return data.data;
}

export async function fetchFieldMap(filters: FieldMapFilters = {}): Promise<FieldMapSnapshot> {
  const { data } = await apiClient.get<ApiResponse<FieldMapSnapshot>>(`${BASE}/map`, {
    params: filters,
  });
  return data.data;
}

export async function fetchFieldOpsStatistics(
  from?: string,
  to?: string,
): Promise<FieldOpsStatistics> {
  const { data } = await apiClient.get<ApiResponse<FieldOpsStatistics>>(`${BASE}/statistics`, {
    params: { from, to },
  });
  return data.data;
}

export async function fetchNearestPersonnel(
  mapX: number,
  mapY: number,
  limit = 5,
): Promise<NearestPersonnelResult[]> {
  const { data } = await apiClient.get<ApiResponse<NearestPersonnelResult[]>>(
    `${BASE}/nearest-personnel`,
    { params: { mapX, mapY, limit } },
  );
  return data.data;
}

// ── Zones ───────────────────────────────────────────────────────

export async function listZones(params: ListParams = {}): Promise<PaginatedResponse<SecurityZone>> {
  const { data } = await apiClient.get<
    ApiResponse<SecurityZone[]> & { meta?: PaginatedResponse<SecurityZone>['meta'] }
  >(`${BASE}/zones`, { params });
  return unwrapList(data);
}

export async function getZone(id: string): Promise<SecurityZone> {
  const { data } = await apiClient.get<ApiResponse<SecurityZone>>(`${BASE}/zones/${id}`);
  return data.data;
}

export async function createZone(payload: CreateZonePayload): Promise<SecurityZone> {
  const { data } = await apiClient.post<ApiResponse<SecurityZone>>(`${BASE}/zones`, payload);
  return data.data;
}

export async function updateZone(id: string, payload: UpdateZonePayload): Promise<SecurityZone> {
  const { data } = await apiClient.patch<ApiResponse<SecurityZone>>(`${BASE}/zones/${id}`, payload);
  return data.data;
}

export async function deleteZone(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/zones/${id}`);
}

// ── Checkpoints ─────────────────────────────────────────────────

export async function listCheckpoints(
  params: ListParams = {},
): Promise<PaginatedResponse<SecurityCheckpoint>> {
  const { data } = await apiClient.get<
    ApiResponse<SecurityCheckpoint[]> & { meta?: PaginatedResponse<SecurityCheckpoint>['meta'] }
  >(`${BASE}/checkpoints`, { params });
  return unwrapList(data);
}

export async function getCheckpoint(id: string): Promise<SecurityCheckpoint> {
  const { data } = await apiClient.get<ApiResponse<SecurityCheckpoint>>(
    `${BASE}/checkpoints/${id}`,
  );
  return data.data;
}

export async function createCheckpoint(
  payload: CreateCheckpointPayload,
): Promise<SecurityCheckpoint> {
  const { data } = await apiClient.post<ApiResponse<SecurityCheckpoint>>(
    `${BASE}/checkpoints`,
    payload,
  );
  return data.data;
}

export async function updateCheckpoint(
  id: string,
  payload: UpdateCheckpointPayload,
): Promise<SecurityCheckpoint> {
  const { data } = await apiClient.patch<ApiResponse<SecurityCheckpoint>>(
    `${BASE}/checkpoints/${id}`,
    payload,
  );
  return data.data;
}

export async function deleteCheckpoint(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/checkpoints/${id}`);
}

export async function regenerateCheckpointQr(id: string): Promise<SecurityCheckpoint> {
  const { data } = await apiClient.post<ApiResponse<SecurityCheckpoint>>(
    `${BASE}/checkpoints/${id}/regenerate-qr`,
  );
  return data.data;
}

// ── Patrol routes ───────────────────────────────────────────────

export async function listPatrolRoutes(
  params: ListParams = {},
): Promise<PaginatedResponse<PatrolRoute>> {
  const { data } = await apiClient.get<
    ApiResponse<PatrolRoute[]> & { meta?: PaginatedResponse<PatrolRoute>['meta'] }
  >(`${BASE}/patrol-routes`, { params });
  return unwrapList(data);
}

export async function getPatrolRoute(id: string): Promise<PatrolRoute> {
  const { data } = await apiClient.get<ApiResponse<PatrolRoute>>(`${BASE}/patrol-routes/${id}`);
  return data.data;
}

export async function createPatrolRoute(payload: CreatePatrolRoutePayload): Promise<PatrolRoute> {
  const { data } = await apiClient.post<ApiResponse<PatrolRoute>>(`${BASE}/patrol-routes`, payload);
  return data.data;
}

export async function updatePatrolRoute(
  id: string,
  payload: UpdatePatrolRoutePayload,
): Promise<PatrolRoute> {
  const { data } = await apiClient.patch<ApiResponse<PatrolRoute>>(
    `${BASE}/patrol-routes/${id}`,
    payload,
  );
  return data.data;
}

export async function deletePatrolRoute(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/patrol-routes/${id}`);
}

// ── Patrol sessions ─────────────────────────────────────────────

export async function listPatrolSessions(
  params: ListParams = {},
): Promise<PaginatedResponse<PatrolSession>> {
  const { data } = await apiClient.get<
    ApiResponse<PatrolSession[]> & { meta?: PaginatedResponse<PatrolSession>['meta'] }
  >(`${BASE}/patrol-sessions`, { params });
  return unwrapList(data);
}

export async function getPatrolSession(id: string): Promise<PatrolSession> {
  const { data } = await apiClient.get<ApiResponse<PatrolSession>>(
    `${BASE}/patrol-sessions/${id}`,
  );
  return data.data;
}

export async function createPatrolSession(
  payload: CreatePatrolSessionPayload,
): Promise<PatrolSession> {
  const { data } = await apiClient.post<ApiResponse<PatrolSession>>(
    `${BASE}/patrol-sessions`,
    payload,
  );
  return data.data;
}

export async function assignPatrolSession(
  id: string,
  payload: AssignPatrolPayload,
): Promise<PatrolSession> {
  const { data } = await apiClient.post<ApiResponse<PatrolSession>>(
    `${BASE}/patrol-sessions/${id}/assign`,
    payload,
  );
  return data.data;
}

export async function startPatrolSession(id: string): Promise<PatrolSession> {
  const { data } = await apiClient.post<ApiResponse<PatrolSession>>(
    `${BASE}/patrol-sessions/${id}/start`,
  );
  return data.data;
}

export async function completePatrolSession(id: string): Promise<PatrolSession> {
  const { data } = await apiClient.post<ApiResponse<PatrolSession>>(
    `${BASE}/patrol-sessions/${id}/complete`,
  );
  return data.data;
}

export async function cancelPatrolSession(
  id: string,
  payload: CancelPatrolPayload = {},
): Promise<PatrolSession> {
  const { data } = await apiClient.post<ApiResponse<PatrolSession>>(
    `${BASE}/patrol-sessions/${id}/cancel`,
    payload,
  );
  return data.data;
}

export async function recordPatrolVisit(
  sessionId: string,
  payload: RecordPatrolVisitPayload,
): Promise<PatrolCheckpointVisit> {
  const { data } = await apiClient.post<ApiResponse<PatrolCheckpointVisit>>(
    `${BASE}/patrol-sessions/${sessionId}/visits`,
    payload,
  );
  return data.data;
}

// ── Personnel locations ─────────────────────────────────────────

export async function listPersonnelLocations(
  params: ListParams = {},
): Promise<PaginatedResponse<PersonnelLocation>> {
  const { data } = await apiClient.get<
    ApiResponse<PersonnelLocation[]> & { meta?: PaginatedResponse<PersonnelLocation>['meta'] }
  >(`${BASE}/personnel-locations`, { params });
  return unwrapList(data);
}

export async function updateMyLocation(
  payload: UpdatePersonnelLocationPayload,
): Promise<PersonnelLocation> {
  const { data } = await apiClient.post<ApiResponse<PersonnelLocation>>(
    `${BASE}/personnel-locations/me`,
    payload,
  );
  return data.data;
}

export async function updatePersonnelLocation(
  userId: string,
  payload: UpdatePersonnelLocationPayload,
): Promise<PersonnelLocation> {
  const { data } = await apiClient.patch<ApiResponse<PersonnelLocation>>(
    `${BASE}/personnel-locations/${userId}`,
    payload,
  );
  return data.data;
}

// ── Field alerts ────────────────────────────────────────────────

export async function listFieldAlerts(
  params: ListParams = {},
): Promise<PaginatedResponse<FieldAlert>> {
  const { data } = await apiClient.get<
    ApiResponse<FieldAlert[]> & { meta?: PaginatedResponse<FieldAlert>['meta'] }
  >(`${BASE}/alerts`, { params });
  return unwrapList(data);
}

export async function getFieldAlert(id: string): Promise<FieldAlert> {
  const { data } = await apiClient.get<ApiResponse<FieldAlert>>(`${BASE}/alerts/${id}`);
  return data.data;
}

export async function createFieldAlert(payload: CreateFieldAlertPayload): Promise<FieldAlert> {
  const { data } = await apiClient.post<ApiResponse<FieldAlert>>(`${BASE}/alerts`, payload);
  return data.data;
}

export async function createSosAlert(payload: SosAlertPayload = {}): Promise<FieldAlert> {
  const { data } = await apiClient.post<ApiResponse<FieldAlert>>(`${BASE}/alerts/sos`, payload);
  return data.data;
}

export async function acknowledgeFieldAlert(id: string): Promise<FieldAlert> {
  const { data } = await apiClient.post<ApiResponse<FieldAlert>>(
    `${BASE}/alerts/${id}/acknowledge`,
  );
  return data.data;
}

export async function resolveFieldAlert(
  id: string,
  payload: ResolveAlertPayload = {},
): Promise<FieldAlert> {
  const { data } = await apiClient.post<ApiResponse<FieldAlert>>(
    `${BASE}/alerts/${id}/resolve`,
    payload,
  );
  return data.data;
}
