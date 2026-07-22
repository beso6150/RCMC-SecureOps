import { AuditAction } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../../shared/errors/index.js';
import { auditService } from '../../identity/application/AuditService.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { visitorRepository } from '../infrastructure/VisitorRepository.js';

class FloorService {
  async list() {
    return visitorRepository.listFloors();
  }

  async getById(id: string) {
    const floor = await visitorRepository.findFloorById(id);
    if (!floor) throw new NotFoundError('Floor not found');
    return floor;
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: { code?: string; nameEn?: string; nameAr?: string; level?: number },
    meta: RequestMeta = {},
  ) {
    await this.getById(id);
    try {
      const floor = await visitorRepository.updateFloor(id, {
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.nameEn !== undefined ? { nameEn: input.nameEn } : {}),
        ...(input.nameAr !== undefined ? { nameAr: input.nameAr } : {}),
        ...(input.level !== undefined ? { level: input.level } : {}),
      });
      await auditService.log({
        actorId: actor.id,
        action: AuditAction.UPDATE,
        entityType: 'Floor',
        entityId: id,
        metadata: { changedFields: Object.keys(input) },
        meta,
      });
      return floor;
    } catch (err: unknown) {
      if (typeof err === 'object' && err && 'code' in err && (err as { code: string }).code === 'P2002') {
        throw new ConflictError('Floor code already exists in this building');
      }
      throw err;
    }
  }
}

class MeetingRoomService {
  async list(floorId?: string) {
    return visitorRepository.listMeetingRooms(floorId);
  }

  async getById(id: string) {
    const room = await visitorRepository.findMeetingRoomById(id);
    if (!room) throw new NotFoundError('Meeting room not found');
    return room;
  }

  async create(
    actor: AuthenticatedUser,
    input: {
      floorId: string;
      code: string;
      nameEn: string;
      nameAr: string;
      capacity?: number | null;
      isActive?: boolean;
    },
    meta: RequestMeta = {},
  ) {
    const floor = await visitorRepository.findFloorById(input.floorId);
    if (!floor) throw new NotFoundError('Floor not found');

    try {
      const room = await visitorRepository.createMeetingRoom(input);
      await auditService.log({
        actorId: actor.id,
        action: AuditAction.CREATE,
        entityType: 'MeetingRoom',
        entityId: room.id,
        metadata: { floorId: input.floorId, code: input.code },
        meta,
      });
      return room;
    } catch (err: unknown) {
      if (typeof err === 'object' && err && 'code' in err && (err as { code: string }).code === 'P2002') {
        throw new ConflictError('Meeting room code already exists on this floor');
      }
      throw err;
    }
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: {
      code?: string;
      nameEn?: string;
      nameAr?: string;
      capacity?: number | null;
      isActive?: boolean;
      floorId?: string;
    },
    meta: RequestMeta = {},
  ) {
    await this.getById(id);
    if (input.floorId) {
      const floor = await visitorRepository.findFloorById(input.floorId);
      if (!floor) throw new NotFoundError('Floor not found');
    }

    const room = await visitorRepository.updateMeetingRoom(id, {
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.nameEn !== undefined ? { nameEn: input.nameEn } : {}),
      ...(input.nameAr !== undefined ? { nameAr: input.nameAr } : {}),
      ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.floorId !== undefined ? { floor: { connect: { id: input.floorId } } } : {}),
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'MeetingRoom',
      entityId: id,
      metadata: { changedFields: Object.keys(input) },
      meta,
    });

    return room;
  }

  async remove(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    await this.getById(id);
    await visitorRepository.softDeleteMeetingRoom(id);
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'MeetingRoom',
      entityId: id,
      meta,
    });
  }
}

export const floorService = new FloorService();
export const meetingRoomService = new MeetingRoomService();
