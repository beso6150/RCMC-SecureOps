import { broadcast } from '../../../shared/realtime/socketServer.js';

export function emitCctvRefresh(reason: string, entityId?: string): void {
  broadcast('cctv:refresh', { reason, entityId, at: new Date().toISOString() });
}

export function emitCameraRequestUpdated(request: unknown): void {
  broadcast('camera_request:updated', request);
}
