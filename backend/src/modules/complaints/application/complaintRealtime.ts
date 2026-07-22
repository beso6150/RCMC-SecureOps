import { broadcast } from '../../../shared/realtime/socketServer.js';

export function emitComplaintRefresh(reason: string, entityId?: string): void {
  const payload = { reason, entityId, at: new Date().toISOString() };
  broadcast('director:refresh', payload);
  broadcast('dashboard:refresh', { ...payload, reason: `complaint:${reason}` });
}
