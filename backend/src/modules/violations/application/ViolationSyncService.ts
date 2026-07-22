import { ValidationError } from '../../../shared/errors/index.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { violationService, CreateViolationInput } from './ViolationService.js';
import { violationRepository } from '../infrastructure/ViolationRepository.js';

export interface SyncPushItem {
  clientSyncId: string;
  plateNumber: string;
  ocrResult?: string | null;
  ocrConfidence?: number | null;
  arabicPlate?: string | null;
  englishPlate?: string | null;
  vehicleColor?: string | null;
  violationType: CreateViolationInput['violationType'];
  parkingCode: CreateViolationInput['parkingCode'];
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  imagePath?: string | null;
  notes?: string | null;
  detectedAt?: string | Date;
  attachments?: CreateViolationInput['attachments'];
}

export interface SyncPushResult {
  clientSyncId: string;
  serverId: string;
  status: string;
  created: boolean;
}

class ViolationSyncService {
  async push(
    actor: AuthenticatedUser,
    items: SyncPushItem[],
    meta: RequestMeta = {},
  ): Promise<{ results: SyncPushResult[]; serverTime: string }> {
    const results: SyncPushResult[] = [];

    for (const item of items) {
      const existing = await violationRepository.findByClientSyncId(item.clientSyncId);
      if (existing) {
        results.push({
          clientSyncId: item.clientSyncId,
          serverId: existing.id,
          status: existing.status,
          created: false,
        });
        continue;
      }

      const created = await violationService.create(
        actor,
        {
          ...item,
          detectedAt: item.detectedAt ? new Date(item.detectedAt) : undefined,
          autoAssign: true,
        },
        meta,
      );

      results.push({
        clientSyncId: item.clientSyncId,
        serverId: created!.id,
        status: created!.status,
        created: true,
      });
    }

    return { results, serverTime: new Date().toISOString() };
  }

  async pull(sinceIso: string) {
    const since = new Date(sinceIso);
    if (Number.isNaN(since.getTime())) {
      throw new ValidationError('Invalid since timestamp');
    }

    const changes = await violationRepository.findChangedSince(since);

    return {
      since,
      serverTime: new Date().toISOString(),
      changes: changes.map((v) => ({
        id: v.id,
        clientSyncId: v.clientSyncId,
        deleted: v.deletedAt != null,
        updatedAt: v.updatedAt,
        deletedAt: v.deletedAt,
        record: v.deletedAt ? null : v,
      })),
    };
  }
}

export const violationSyncService = new ViolationSyncService();
