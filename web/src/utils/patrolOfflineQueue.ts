import type { PatrolSession, RecordPatrolVisitPayload } from '../types/fieldOperations';

const STORAGE_KEY = 'rcmc.fieldOps.patrolOfflineQueue.v1';

export interface PendingPatrolVisit extends RecordPatrolVisitPayload {
  offlineId: string;
  patrolSessionId: string;
  queuedAt: string;
  lastError?: string | null;
}

export interface PatrolOfflineState {
  currentPatrolSessionId: string | null;
  currentPatrolSnapshot: PatrolSession | null;
  pendingVisits: PendingPatrolVisit[];
  updatedAt: string;
}

function emptyState(): PatrolOfflineState {
  return {
    currentPatrolSessionId: null,
    currentPatrolSnapshot: null,
    pendingVisits: [],
    updatedAt: new Date().toISOString(),
  };
}

export function createClientSyncId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function loadPatrolOfflineState(): PatrolOfflineState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as PatrolOfflineState;
    return {
      ...emptyState(),
      ...parsed,
      pendingVisits: Array.isArray(parsed.pendingVisits) ? parsed.pendingVisits : [],
    };
  } catch {
    return emptyState();
  }
}

export function savePatrolOfflineState(state: PatrolOfflineState): void {
  const next: PatrolOfflineState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function setCurrentOfflinePatrol(session: PatrolSession | null): PatrolOfflineState {
  const state = loadPatrolOfflineState();
  const next: PatrolOfflineState = {
    ...state,
    currentPatrolSessionId: session?.id ?? null,
    currentPatrolSnapshot: session,
  };
  savePatrolOfflineState(next);
  return next;
}

export function enqueueOfflineVisit(
  patrolSessionId: string,
  payload: Omit<RecordPatrolVisitPayload, 'clientSyncId'> & { clientSyncId?: string },
): PendingPatrolVisit {
  const state = loadPatrolOfflineState();
  const clientSyncId = payload.clientSyncId ?? createClientSyncId();

  const existing = state.pendingVisits.find((v) => v.clientSyncId === clientSyncId);
  if (existing) return existing;

  const visit: PendingPatrolVisit = {
    ...payload,
    clientSyncId,
    offlineId: createClientSyncId(),
    patrolSessionId,
    queuedAt: new Date().toISOString(),
    lastError: null,
  };

  const next: PatrolOfflineState = {
    ...state,
    currentPatrolSessionId: state.currentPatrolSessionId ?? patrolSessionId,
    pendingVisits: [...state.pendingVisits, visit],
  };
  savePatrolOfflineState(next);
  return visit;
}

export function removePendingVisitBySyncId(clientSyncId: string): PatrolOfflineState {
  const state = loadPatrolOfflineState();
  const next: PatrolOfflineState = {
    ...state,
    pendingVisits: state.pendingVisits.filter((v) => v.clientSyncId !== clientSyncId),
  };
  savePatrolOfflineState(next);
  return next;
}

export function markPendingVisitError(
  clientSyncId: string,
  lastError: string,
): PatrolOfflineState {
  const state = loadPatrolOfflineState();
  const next: PatrolOfflineState = {
    ...state,
    pendingVisits: state.pendingVisits.map((v) =>
      v.clientSyncId === clientSyncId ? { ...v, lastError } : v,
    ),
  };
  savePatrolOfflineState(next);
  return next;
}

export function clearOfflinePatrolQueue(): void {
  savePatrolOfflineState(emptyState());
}
