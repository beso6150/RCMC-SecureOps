import {
  AuditAction,
  HostCommunicationPreference,
  VisitHistoryAction,
  VisitStatus,
} from '@prisma/client';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/index.js';
import { auditService } from '../../identity/application/AuditService.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { VISIT_STATUS_TRANSITIONS } from '../domain/constants.js';
import { CreateHostInput, CreateVisitorInput, VisitorListFilters } from '../domain/types.js';
import { visitorRepository } from '../infrastructure/VisitorRepository.js';
import { visitArrivalService } from './VisitArrivalService.js';

class HostService {
  async list(search?: string) {
    return visitorRepository.listHosts(search);
  }

  async getById(id: string) {
    const host = await visitorRepository.findHostById(id);
    if (!host) throw new NotFoundError('Host not found');
    return host;
  }

  async create(actor: AuthenticatedUser, input: CreateHostInput, meta: RequestMeta = {}) {
    this.assertPreferenceFlags(input);
    try {
      const host = await visitorRepository.createHost(input);
      await auditService.log({
        actorId: actor.id,
        action: AuditAction.CREATE,
        entityType: 'Host',
        entityId: host.id,
        metadata: { employeeNumber: host.employeeNumber },
        meta,
      });
      return host;
    } catch (err: unknown) {
      if (typeof err === 'object' && err && 'code' in err && (err as { code: string }).code === 'P2002') {
        throw new ConflictError('Host with this employee number already exists');
      }
      throw err;
    }
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: Partial<CreateHostInput>,
    meta: RequestMeta = {},
  ) {
    await this.getById(id);
    this.assertPreferenceFlags(input);
    const host = await visitorRepository.updateHost(id, {
      ...(input.employeeNumber !== undefined ? { employeeNumber: input.employeeNumber } : {}),
      ...(input.employeeName !== undefined ? { employeeName: input.employeeName } : {}),
      ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.userId !== undefined ? { userId: input.userId } : {}),
      ...(input.communicationPreference !== undefined
        ? { communicationPreference: input.communicationPreference }
        : {}),
      ...(input.whatsappEnabled !== undefined ? { whatsappEnabled: input.whatsappEnabled } : {}),
      ...(input.phoneCallEnabled !== undefined ? { phoneCallEnabled: input.phoneCallEnabled } : {}),
    });
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Host',
      entityId: id,
      metadata: { changedFields: Object.keys(input) },
      meta,
    });
    return host;
  }

  async remove(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    await this.getById(id);
    await visitorRepository.softDeleteHost(id);
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'Host',
      entityId: id,
      meta,
    });
  }

  private assertPreferenceFlags(input: Partial<CreateHostInput>): void {
    const pref = input.communicationPreference;
    if (!pref) return;
    if (pref === HostCommunicationPreference.WHATSAPP && input.whatsappEnabled === false) {
      throw new ValidationError('WhatsApp preference requires whatsappEnabled=true');
    }
    if (pref === HostCommunicationPreference.PHONE_CALL && input.phoneCallEnabled === false) {
      throw new ValidationError('Phone call preference requires phoneCallEnabled=true');
    }
  }
}

class VisitorService {
  async list(filters: VisitorListFilters) {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const { rows, total } = await visitorRepository.listVisitors(filters);
    return { data: rows, meta: { page, pageSize, total } };
  }

  async getById(id: string) {
    const visitor = await visitorRepository.findVisitorById(id);
    if (!visitor) throw new NotFoundError('Visitor not found');
    return visitor;
  }

  async create(actor: AuthenticatedUser, input: CreateVisitorInput, meta: RequestMeta = {}) {
    const host = await visitorRepository.findHostById(input.hostId);
    if (!host) throw new NotFoundError('Host not found');

    if (input.meetingRoomId) {
      const room = await visitorRepository.findMeetingRoomById(input.meetingRoomId);
      if (!room) throw new NotFoundError('Meeting room not found');
      if (input.floorId && input.floorId !== room.floorId) {
        throw new ValidationError('Meeting room does not belong to the selected floor');
      }
      input.floorId = input.floorId ?? room.floorId;
    }

    if (input.floorId) {
      const floor = await visitorRepository.findFloorById(input.floorId);
      if (!floor) throw new NotFoundError('Floor not found');
    }

    const visitor = await visitorRepository.createVisitor({
      ...input,
      hostUserId: host.userId,
    });

    await visitorRepository.addHistory({
      visitorId: visitor.id,
      action: VisitHistoryAction.CREATED,
      actorId: actor.id,
      toStatus: VisitStatus.UPCOMING,
      metadata: { importance: visitor.importance },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'Visitor',
      entityId: visitor.id,
      metadata: {
        visitorName: visitor.visitorName,
        hostId: visitor.hostId,
        importance: visitor.importance,
      },
      meta,
    });

    return visitor;
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: Partial<CreateVisitorInput> & { status?: VisitStatus },
    meta: RequestMeta = {},
  ) {
    const existing = await this.getById(id);
    if (existing.status === VisitStatus.COMPLETED || existing.status === VisitStatus.CANCELLED) {
      throw new ConflictError('Closed visits cannot be updated');
    }

    if (input.status && input.status !== existing.status) {
      const allowed = VISIT_STATUS_TRANSITIONS[existing.status] ?? [];
      if (!allowed.includes(input.status)) {
        throw new ConflictError(`Invalid status transition: ${existing.status} → ${input.status}`);
      }
    }

    if (input.meetingRoomId) {
      const room = await visitorRepository.findMeetingRoomById(input.meetingRoomId);
      if (!room) throw new NotFoundError('Meeting room not found');
      input.floorId = input.floorId ?? room.floorId;
    }

    const updated = await visitorRepository.updateVisitor(id, {
      ...(input.visitorName !== undefined ? { visitorName: input.visitorName } : {}),
      ...(input.nationalId !== undefined ? { nationalId: input.nationalId } : {}),
      ...(input.organization !== undefined ? { organization: input.organization } : {}),
      ...(input.mobile !== undefined ? { mobile: input.mobile } : {}),
      ...(input.vehiclePlate !== undefined ? { vehiclePlate: input.vehiclePlate } : {}),
      ...(input.visitDate !== undefined ? { visitDate: input.visitDate } : {}),
      ...(input.arrivalTime !== undefined ? { arrivalTime: input.arrivalTime } : {}),
      ...(input.departureTime !== undefined ? { departureTime: input.departureTime } : {}),
      ...(input.importance !== undefined ? { importance: input.importance } : {}),
      ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
      ...(input.hostId !== undefined ? { host: { connect: { id: input.hostId } } } : {}),
      ...(input.floorId !== undefined
        ? input.floorId
          ? { floor: { connect: { id: input.floorId } } }
          : { floor: { disconnect: true } }
        : {}),
      ...(input.meetingRoomId !== undefined
        ? input.meetingRoomId
          ? { meetingRoom: { connect: { id: input.meetingRoomId } } }
          : { meetingRoom: { disconnect: true } }
        : {}),
      ...(input.locationId !== undefined
        ? input.locationId
          ? { location: { connect: { id: input.locationId } } }
          : { location: { disconnect: true } }
        : {}),
      ...(input.badgeNumber !== undefined ? { badgeNumber: input.badgeNumber } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    });

    await visitorRepository.addHistory({
      visitorId: id,
      action: input.status ? VisitHistoryAction.STATUS_CHANGED : VisitHistoryAction.UPDATED,
      actorId: actor.id,
      fromStatus: existing.status,
      toStatus: updated.status,
      metadata: { changedFields: Object.keys(input) },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Visitor',
      entityId: id,
      metadata: { changedFields: Object.keys(input) },
      meta,
    });

    return updated;
  }

  async markArrived(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    return visitArrivalService.markArrived(actor, id, meta);
  }

  async startMeeting(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const existing = await this.getById(id);
    const allowed = VISIT_STATUS_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(VisitStatus.IN_MEETING)) {
      throw new ConflictError(`Cannot start meeting from status ${existing.status}`);
    }

    const now = new Date();
    const updated = await visitorRepository.updateVisitor(id, {
      status: VisitStatus.IN_MEETING,
      hostRespondedAt: existing.hostRespondedAt ?? now,
    });

    await visitorRepository.addHistory({
      visitorId: id,
      action: VisitHistoryAction.IN_MEETING,
      actorId: actor.id,
      fromStatus: existing.status,
      toStatus: VisitStatus.IN_MEETING,
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Visitor',
      entityId: id,
      metadata: { status: VisitStatus.IN_MEETING },
      meta,
    });

    return updated;
  }

  async complete(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const existing = await this.getById(id);
    const allowed = VISIT_STATUS_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(VisitStatus.COMPLETED)) {
      throw new ConflictError(`Cannot complete visit from status ${existing.status}`);
    }

    const updated = await visitorRepository.updateVisitor(id, {
      status: VisitStatus.COMPLETED,
      departureTime: existing.departureTime ?? new Date(),
    });

    await visitorRepository.addHistory({
      visitorId: id,
      action: VisitHistoryAction.COMPLETED,
      actorId: actor.id,
      fromStatus: existing.status,
      toStatus: VisitStatus.COMPLETED,
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Visitor',
      entityId: id,
      metadata: { status: VisitStatus.COMPLETED },
      meta,
    });

    return updated;
  }

  async cancel(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const existing = await this.getById(id);
    if (existing.status === VisitStatus.COMPLETED || existing.status === VisitStatus.CANCELLED) {
      throw new ConflictError('Visit is already closed');
    }

    const updated = await visitorRepository.updateVisitor(id, {
      status: VisitStatus.CANCELLED,
    });

    await visitorRepository.addHistory({
      visitorId: id,
      action: VisitHistoryAction.CANCELLED,
      actorId: actor.id,
      fromStatus: existing.status,
      toStatus: VisitStatus.CANCELLED,
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Visitor',
      entityId: id,
      metadata: { status: VisitStatus.CANCELLED },
      meta,
    });

    return updated;
  }

  async history(id: string) {
    await this.getById(id);
    return visitorRepository.listHistory(id);
  }

  async notifications(id: string) {
    await this.getById(id);
    return visitorRepository.listNotifications(id);
  }
}

export const hostService = new HostService();
export const visitorService = new VisitorService();
