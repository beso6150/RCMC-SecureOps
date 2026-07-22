import { useCallback, useEffect, useState } from 'react';
import { recordPatrolVisit } from '../api/fieldOperations';
import {
  loadPatrolOfflineState,
  markPendingVisitError,
  removePendingVisitBySyncId,
  type PatrolOfflineState,
} from '../utils/patrolOfflineQueue';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return online;
}

export function usePatrolOfflineSync(enabled = true) {
  const online = useOnlineStatus();
  const [state, setState] = useState<PatrolOfflineState>(() => loadPatrolOfflineState());
  const [syncing, setSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setState(loadPatrolOfflineState());
  }, []);

  const flush = useCallback(async () => {
    if (!online || !enabled) return;
    const current = loadPatrolOfflineState();
    if (!current.pendingVisits.length) {
      setState(current);
      return;
    }

    setSyncing(true);
    setLastSyncError(null);
    const seen = new Set<string>();

    for (const visit of current.pendingVisits) {
      if (seen.has(visit.clientSyncId)) {
        removePendingVisitBySyncId(visit.clientSyncId);
        continue;
      }
      seen.add(visit.clientSyncId);

      try {
        await recordPatrolVisit(visit.patrolSessionId, {
          checkpointId: visit.checkpointId,
          verificationMethod: visit.verificationMethod,
          mapX: visit.mapX,
          mapY: visit.mapY,
          notes: visit.notes,
          attachmentUrl: visit.attachmentUrl,
          status: visit.status,
          clientSyncId: visit.clientSyncId,
          visitedAt: visit.visitedAt ?? visit.queuedAt,
        });
        removePendingVisitBySyncId(visit.clientSyncId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'تعذّر مزامنة الزيارة';
        markPendingVisitError(visit.clientSyncId, message);
        setLastSyncError(message);
      }
    }

    setState(loadPatrolOfflineState());
    setSyncing(false);
  }, [enabled, online]);

  useEffect(() => {
    if (online && enabled) {
      void flush();
    }
  }, [online, enabled, flush]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key?.includes('patrolOfflineQueue')) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  return {
    online,
    syncing,
    lastSyncError,
    state,
    pendingCount: state.pendingVisits.length,
    refresh,
    flush,
  };
}
