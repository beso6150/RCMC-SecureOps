import { ValidationError } from '../../../shared/errors/index.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { incidentService, CreateIncidentInput } from './IncidentService.js';
import { incidentRepository } from '../infrastructure/IncidentRepository.js';

export interface SyncPushItem extends CreateIncidentInput {
  clientSyncId: string;
}

export interface SyncPushResult {
  clientSyncId: string;
  serverId: string;
  status: string;
  created: boolean;
}

class IncidentSyncService {
  async push(
    actor: AuthenticatedUser,
    items: SyncPushItem[],
    meta: RequestMeta = {},
  ): Promise<{ results: SyncPushResult[]; serverTime: string }> {
    const results: SyncPushResult[] = [];

    for (const item of items) {
      const existing = await incidentRepository.findByClientSyncId(item.clientSyncId);
      if (existing) {
        results.push({
          clientSyncId: item.clientSyncId,
          serverId: existing.id,
          status: existing.status,
          created: false,
        });
        continue;
      }

      const created = await incidentService.create(
        actor,
        {
          ...item,
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

    const changes = await incidentRepository.findChangedSince(since);

    return {
      since,
      serverTime: new Date().toISOString(),
      changes: changes.map((incident) => ({
        id: incident.id,
        clientSyncId: incident.clientSyncId,
        deleted: incident.deletedAt != null,
        updatedAt: incident.updatedAt,
        deletedAt: incident.deletedAt,
        record: incident.deletedAt ? null : incident,
      })),
    };
  }
}

export const incidentSyncService = new IncidentSyncService();
