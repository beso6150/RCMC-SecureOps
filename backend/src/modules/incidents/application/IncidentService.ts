import {
  AuditAction,
  IncidentHistoryAction,
  IncidentSeverity,
  IncidentSource,
  IncidentStatus,
  ParkingLocationCode,
} from '@prisma/client';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/index.js';
import { auditService } from '../../identity/application/AuditService.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { RoleCodes } from '../../identity/domain/roleCodes.js';
import {
  INCIDENT_STATUS_TRANSITIONS,
  RESPONSE_METRIC,
  SLA_HOURS_BY_SEVERITY,
} from '../domain/constants.js';
import { CreateIncidentData, UpdateIncidentData, IncidentListFilters } from '../domain/types.js';
import { incidentPdfService } from './IncidentPdfService.js';
import { incidentRepository } from '../infrastructure/IncidentRepository.js';
import { emitCctvRefresh } from '../../cctv/application/cctvRealtime.js';
import { shiftRosterService } from '../../shifts/application/ShiftRosterService.js';
import { broadcast } from '../../../shared/realtime/socketServer.js';
import { nextIncidentNumber } from './incidentNumbering.js';
import { assertCanCloseIncident, mapRoleToIncidentSource } from './incidentLifecycle.js';

export interface CreateIncidentInput {
  typeId?: string;
  typeCode?: string;
  title: string;
  description: string;
  notes?: string | null;
  severity?: IncidentSeverity;
  parkingCode?: ParkingLocationCode | null;
  floorId?: string | null;
  meetingRoomId?: string | null;
  shiftId?: string | null;
  zoneId?: string | null;
  checkpointId?: string | null;
  patrolSessionId?: string | null;
  mapX?: number | null;
  mapY?: number | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  occurredAt?: Date;
  clientSyncId?: string | null;
  autoAssign?: boolean;
  supervisorId?: string | null;
  opsManagerId?: string | null;
  attachments?: CreateIncidentData['attachments'];
}

export interface AssignIncidentInput {
  assigneeId?: string | null;
  supervisorId?: string | null;
  opsManagerId?: string | null;
}

export interface CloseIncidentInput {
  notes?: string | null;
}

export interface CancelIncidentInput {
  notes?: string | null;
}

export interface HoldIncidentInput {
  notes?: string | null;
}

class IncidentService {
  async listTypes() {
    return incidentRepository.listTypes();
  }

  async createType(
    actor: AuthenticatedUser,
    input: {
      code: string;
      nameAr: string;
      nameEn: string;
      description?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    },
    meta: RequestMeta = {},
  ) {
    const existing = await incidentRepository.findTypeByCode(input.code);
    if (existing) {
      throw new ConflictError('Incident type code already exists');
    }

    const type = await incidentRepository.createType(input);

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'IncidentType',
      entityId: type.id,
      metadata: { code: type.code },
      meta,
    });

    return type;
  }

  async updateType(
    actor: AuthenticatedUser,
    id: string,
    input: {
      code?: string;
      nameAr?: string;
      nameEn?: string;
      description?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    },
    meta: RequestMeta = {},
  ) {
    const existing = await incidentRepository.findTypeById(id);
    if (!existing) throw new NotFoundError('Incident type not found');

    if (input.code && input.code !== existing.code) {
      const conflict = await incidentRepository.findTypeByCode(input.code);
      if (conflict) throw new ConflictError('Incident type code already exists');
    }

    const type = await incidentRepository.updateType(id, input);

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'IncidentType',
      entityId: type.id,
      metadata: { changedFields: Object.keys(input) },
      meta,
    });

    return type;
  }

  async list(filters: IncidentListFilters) {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const { rows, total } = await incidentRepository.list(filters);
    return {
      data: rows,
      meta: { page, pageSize, total },
    };
  }

  async getById(id: string) {
    const incident = await incidentRepository.findById(id);
    if (!incident) throw new NotFoundError('Incident not found');
    return incident;
  }

  async create(
    actor: AuthenticatedUser,
    input: CreateIncidentInput,
    meta: RequestMeta = {},
  ) {
    if (input.clientSyncId) {
      const existing = await incidentRepository.findByClientSyncId(input.clientSyncId);
      if (existing) {
        return existing;
      }
    }

    const type = await this.resolveType(input.typeId, input.typeCode);
    if (!type) {
      throw new ValidationError('Incident type is required');
    }

    let locationId: string | null = null;
    if (input.parkingCode) {
      const location = await incidentRepository.getLocationByParkingCode(input.parkingCode);
      if (!location) {
        throw new ValidationError(
          `Parking location not configured: ${input.parkingCode}. Run database seed.`,
        );
      }
      locationId = location.id;
    }

    const severity = input.severity ?? IncidentSeverity.MEDIUM;
    const occurredAt = input.occurredAt ?? new Date();
    const reportedAt = new Date();
    const slaDueAt = new Date(
      occurredAt.getTime() + SLA_HOURS_BY_SEVERITY[severity] * 60 * 60 * 1000,
    );
    const incidentNumber = await nextIncidentNumber(reportedAt);
    const source = mapRoleToIncidentSource(actor.roleCode) as IncidentSource;

    const shouldAutoAssign = input.autoAssign !== false;
    let supervisorId = input.supervisorId ?? null;
    let opsManagerId = input.opsManagerId ?? null;
    let assigneeId: string | null = null;
    let status: IncidentStatus = IncidentStatus.REPORTED;

    if (shouldAutoAssign && !supervisorId && !opsManagerId) {
      const assignment = await this.resolveAutoAssignment(actor.roleCode);
      supervisorId = assignment.supervisorId;
      opsManagerId = assignment.opsManagerId;
      assigneeId = assignment.assigneeId;
      if (assigneeId) {
        status = IncidentStatus.ASSIGNED;
      }
    } else if (supervisorId || opsManagerId) {
      if (supervisorId) await shiftRosterService.assertAssigneeAllowed(actor, supervisorId);
      if (opsManagerId) await shiftRosterService.assertAssigneeAllowed(actor, opsManagerId);
      assigneeId = supervisorId ?? opsManagerId;
      status = IncidentStatus.ASSIGNED;
    }

    const incident = await incidentRepository.create({
      typeId: type.id,
      title: input.title.trim(),
      description: input.description.trim(),
      notes: input.notes ?? null,
      severity,
      status,
      incidentNumber,
      source,
      parkingCode: input.parkingCode ?? null,
      floorId: input.floorId ?? null,
      meetingRoomId: input.meetingRoomId ?? null,
      locationId,
      zoneId: input.zoneId ?? null,
      checkpointId: input.checkpointId ?? null,
      patrolSessionId: input.patrolSessionId ?? null,
      mapX: input.mapX ?? null,
      mapY: input.mapY ?? null,
      shiftId: input.shiftId ?? actor.shiftId ?? null,
      reporterId: actor.id,
      assigneeId,
      supervisorId,
      opsManagerId,
      gpsLatitude: input.gpsLatitude ?? null,
      gpsLongitude: input.gpsLongitude ?? null,
      occurredAt,
      reportedAt,
      slaDueAt,
      clientSyncId: input.clientSyncId ?? null,
      attachments: input.attachments,
    });

    await incidentRepository.addHistory({
      incidentId: incident.id,
      action: IncidentHistoryAction.CREATED,
      actorId: actor.id,
      toStatus: status,
      metadata: { severity, typeCode: type.code, incidentNumber },
    });

    await incidentRepository.addHistory({
      incidentId: incident.id,
      action: IncidentHistoryAction.REPORTED,
      actorId: actor.id,
      toStatus: status,
      metadata: { source },
    });

    await incidentRepository.startResponseTime({
      incidentId: incident.id,
      actorId: actor.id,
      metricKey: RESPONSE_METRIC,
      startedAt: incident.createdAt,
    });

    if (status === IncidentStatus.ASSIGNED) {
      await incidentRepository.addHistory({
        incidentId: incident.id,
        action: IncidentHistoryAction.ASSIGNED,
        actorId: actor.id,
        fromStatus: IncidentStatus.REPORTED,
        toStatus: IncidentStatus.ASSIGNED,
        metadata: { supervisorId, opsManagerId, assigneeId, auto: shouldAutoAssign },
      });

      await auditService.log({
        actorId: actor.id,
        action: AuditAction.ASSIGN,
        entityType: 'Incident',
        entityId: incident.id,
        metadata: { supervisorId, opsManagerId, assigneeId, auto: shouldAutoAssign },
        meta,
      });
    }

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'Incident',
      entityId: incident.id,
      metadata: {
        title: incident.title,
        severity: incident.severity,
        status: incident.status,
        incidentNumber,
        clientSyncId: incident.clientSyncId,
      },
      meta,
    });

    emitCctvRefresh('incident:created', incident.id);
    broadcast('incident:created', {
      incidentId: incident.id,
      incidentNumber,
    });
    broadcast('operations-room:refresh', {
      reason: 'incident:created',
      incidentId: incident.id,
    });

    return incidentRepository.findById(incident.id);
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateIncidentData & { typeCode?: string },
    meta: RequestMeta = {},
  ) {
    const existing = await this.getById(id);

    if (
      existing.status === IncidentStatus.CLOSED ||
      existing.status === IncidentStatus.CANCELLED
    ) {
      throw new ConflictError('Closed incidents cannot be updated');
    }

    let locationId = input.locationId;
    if (input.parkingCode && input.parkingCode !== existing.parkingCode) {
      const location = await incidentRepository.getLocationByParkingCode(input.parkingCode);
      if (!location) {
        throw new ValidationError(`Parking location not configured: ${input.parkingCode}`);
      }
      locationId = location.id;
    }

    let typeId = input.typeId;
    if (input.typeCode) {
      const type = await incidentRepository.findTypeByCode(input.typeCode);
      if (!type) throw new ValidationError(`Unknown incident type: ${input.typeCode}`);
      typeId = type.id;
    }

    if (input.status && input.status !== existing.status) {
      this.assertTransition(existing.status, input.status);
    }

    let slaDueAt = input.slaDueAt;
    if (input.severity && input.severity !== existing.severity) {
      const base = existing.occurredAt;
      slaDueAt = new Date(
        base.getTime() + SLA_HOURS_BY_SEVERITY[input.severity] * 60 * 60 * 1000,
      );
    }

    const updated = await incidentRepository.update(id, {
      ...input,
      ...(typeId ? { typeId } : {}),
      ...(locationId !== undefined ? { locationId } : {}),
      ...(slaDueAt ? { slaDueAt } : {}),
      ...(input.title ? { title: input.title.trim() } : {}),
      ...(input.description ? { description: input.description.trim() } : {}),
    });

    await incidentRepository.addHistory({
      incidentId: id,
      action: IncidentHistoryAction.UPDATED,
      actorId: actor.id,
      fromStatus: existing.status,
      toStatus: updated.status,
      metadata: { changedFields: Object.keys(input) },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Incident',
      entityId: id,
      metadata: { changedFields: Object.keys(input) },
      meta,
    });

    emitCctvRefresh('incident:updated', id);

    if (
      input.zoneId !== undefined ||
      input.checkpointId !== undefined ||
      input.mapX !== undefined ||
      input.mapY !== undefined ||
      input.patrolSessionId !== undefined
    ) {
      broadcast('incident:location-updated', {
        incidentId: id,
        zoneId: updated.zoneId,
        checkpointId: updated.checkpointId,
        mapX: updated.mapX,
        mapY: updated.mapY,
        patrolSessionId: updated.patrolSessionId,
      });
    }

    return updated;
  }

  async assign(
    actor: AuthenticatedUser,
    id: string,
    input: AssignIncidentInput = {},
    meta: RequestMeta = {},
  ) {
    const existing = await this.getById(id);

    if (
      existing.status === IncidentStatus.CLOSED ||
      existing.status === IncidentStatus.CANCELLED
    ) {
      throw new ConflictError('Cannot assign a closed incident');
    }

    let supervisorId = input.supervisorId ?? existing.supervisorId;
    let opsManagerId = input.opsManagerId ?? existing.opsManagerId;
    let assigneeId = input.assigneeId ?? existing.assigneeId;

    if (
      input.assigneeId === undefined &&
      input.supervisorId === undefined &&
      input.opsManagerId === undefined
    ) {
      const assignment = await this.resolveAssignEscalation(actor.roleCode, existing);
      supervisorId = assignment.supervisorId ?? supervisorId;
      opsManagerId = assignment.opsManagerId ?? opsManagerId;
      assigneeId = assignment.assigneeId ?? assigneeId;
    } else if (input.supervisorId) {
      assigneeId = input.supervisorId;
    } else if (input.opsManagerId) {
      assigneeId = input.opsManagerId;
    }

    if (!assigneeId) {
      throw new ValidationError('No available supervisor or operations manager to assign');
    }

    if (assigneeId) {
      await shiftRosterService.assertAssigneeAllowed(actor, assigneeId);
    }
    if (supervisorId && supervisorId !== assigneeId) {
      await shiftRosterService.assertAssigneeAllowed(actor, supervisorId);
    }
    if (opsManagerId && opsManagerId !== assigneeId && opsManagerId !== supervisorId) {
      await shiftRosterService.assertAssigneeAllowed(actor, opsManagerId);
    }

    const nextStatus =
      existing.status === IncidentStatus.NEW ? IncidentStatus.ASSIGNED : existing.status;

    if (nextStatus !== existing.status) {
      this.assertTransition(existing.status, nextStatus);
    }

    const updated = await incidentRepository.update(id, {
      supervisorId,
      opsManagerId,
      assigneeId,
      status: nextStatus,
    });

    await incidentRepository.addHistory({
      incidentId: id,
      action: IncidentHistoryAction.ASSIGNED,
      actorId: actor.id,
      fromStatus: existing.status,
      toStatus: nextStatus,
      metadata: { supervisorId, opsManagerId, assigneeId },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.ASSIGN,
      entityType: 'Incident',
      entityId: id,
      metadata: { supervisorId, opsManagerId, assigneeId },
      meta,
    });

    return updated;
  }

  async startProgress(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const existing = await this.getById(id);
    this.assertTransition(existing.status, IncidentStatus.IN_PROGRESS);

    const startedAt = existing.startedAt ?? new Date();
    const updated = await incidentRepository.update(id, {
      status: IncidentStatus.IN_PROGRESS,
      startedAt,
    });

    await incidentRepository.addHistory({
      incidentId: id,
      action: IncidentHistoryAction.STATUS_CHANGED,
      actorId: actor.id,
      fromStatus: existing.status,
      toStatus: IncidentStatus.IN_PROGRESS,
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Incident',
      entityId: id,
      metadata: { status: IncidentStatus.IN_PROGRESS, startedAt: startedAt.toISOString() },
      meta,
    });

    return updated;
  }

  async hold(
    actor: AuthenticatedUser,
    id: string,
    input: HoldIncidentInput = {},
    meta: RequestMeta = {},
  ) {
    const existing = await this.getById(id);
    this.assertTransition(existing.status, IncidentStatus.ON_HOLD);

    const updated = await incidentRepository.update(id, {
      status: IncidentStatus.ON_HOLD,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    });

    await incidentRepository.addHistory({
      incidentId: id,
      action: IncidentHistoryAction.STATUS_CHANGED,
      actorId: actor.id,
      fromStatus: existing.status,
      toStatus: IncidentStatus.ON_HOLD,
      notes: input.notes ?? null,
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Incident',
      entityId: id,
      metadata: { status: IncidentStatus.ON_HOLD },
      meta,
    });

    return updated;
  }

  async close(
    actor: AuthenticatedUser,
    id: string,
    input: CloseIncidentInput = {},
    meta: RequestMeta = {},
  ) {
    const existing = await this.getById(id);

    if (
      existing.status === IncidentStatus.CLOSED ||
      existing.status === IncidentStatus.CANCELLED
    ) {
      throw new ConflictError('Incident is already closed');
    }

    assertCanCloseIncident({
      roleCode: actor.roleCode,
      severity: existing.severity,
      fromStatus: existing.status,
    });

    const closedAt = new Date();
    const startMs = (existing.startedAt ?? existing.occurredAt).getTime();
    const durationMs = Math.max(0, closedAt.getTime() - startMs);

    const updatedBeforePdf = await incidentRepository.update(id, {
      status: IncidentStatus.CLOSED,
      closedAt,
      resolvedAt: closedAt,
      durationMs,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    });

    await incidentRepository.closeOpenResponseTimes(id, closedAt, actor.id);

    const pdfPath = await incidentPdfService.generate(updatedBeforePdf);
    const updated = await incidentRepository.update(id, { pdfPath });

    await incidentRepository.addHistory({
      incidentId: id,
      action: IncidentHistoryAction.CLOSED,
      actorId: actor.id,
      fromStatus: existing.status,
      toStatus: IncidentStatus.CLOSED,
      notes: input.notes ?? null,
      metadata: { durationMs, pdfPath },
    });

    await incidentRepository.addHistory({
      incidentId: id,
      action: IncidentHistoryAction.PDF_GENERATED,
      actorId: actor.id,
      metadata: { pdfPath },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.APPROVE,
      entityType: 'Incident',
      entityId: id,
      metadata: {
        status: IncidentStatus.CLOSED,
        closedAt: closedAt.toISOString(),
        durationMs,
        pdfPath,
      },
      meta,
    });

    emitCctvRefresh('incident:closed', id);

    return updated;
  }

  async cancel(
    actor: AuthenticatedUser,
    id: string,
    input: CancelIncidentInput = {},
    meta: RequestMeta = {},
  ) {
    const existing = await this.getById(id);

    if (
      existing.status === IncidentStatus.CLOSED ||
      existing.status === IncidentStatus.CANCELLED
    ) {
      throw new ConflictError('Incident is already closed');
    }

    this.assertTransition(existing.status, IncidentStatus.CANCELLED);

    const closedAt = new Date();
    const updated = await incidentRepository.update(id, {
      status: IncidentStatus.CANCELLED,
      closedAt,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    });

    await incidentRepository.closeOpenResponseTimes(id, closedAt, actor.id);

    await incidentRepository.addHistory({
      incidentId: id,
      action: IncidentHistoryAction.CANCELLED,
      actorId: actor.id,
      fromStatus: existing.status,
      toStatus: IncidentStatus.CANCELLED,
      notes: input.notes ?? null,
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Incident',
      entityId: id,
      metadata: { status: IncidentStatus.CANCELLED },
      meta,
    });

    emitCctvRefresh('incident:cancelled', id);

    return updated;
  }

  async addComment(
    actor: AuthenticatedUser,
    id: string,
    body: string,
    meta: RequestMeta = {},
  ) {
    const existing = await this.getById(id);
    if (
      existing.status === IncidentStatus.CLOSED ||
      existing.status === IncidentStatus.CANCELLED
    ) {
      throw new ConflictError('Cannot comment on a closed incident');
    }

    const comment = await incidentRepository.addComment(id, actor.id, body.trim());

    await incidentRepository.addHistory({
      incidentId: id,
      action: IncidentHistoryAction.COMMENTED,
      actorId: actor.id,
      notes: body.trim().slice(0, 500),
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Incident',
      entityId: id,
      metadata: { commentId: comment.id },
      meta,
    });

    return incidentRepository.findById(id);
  }

  async addAttachments(
    actor: AuthenticatedUser,
    id: string,
    attachments: NonNullable<CreateIncidentData['attachments']>,
    meta: RequestMeta = {},
  ) {
    const existing = await this.getById(id);
    if (
      existing.status === IncidentStatus.CLOSED ||
      existing.status === IncidentStatus.CANCELLED
    ) {
      throw new ConflictError('Cannot attach files to a closed incident');
    }

    if (!attachments.length) {
      throw new ValidationError('At least one attachment is required');
    }

    const updated = await incidentRepository.addAttachments(id, attachments);

    await incidentRepository.addHistory({
      incidentId: id,
      action: IncidentHistoryAction.ATTACHMENT_ADDED,
      actorId: actor.id,
      metadata: { count: attachments.length },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Incident',
      entityId: id,
      metadata: { attachmentsAdded: attachments.length },
      meta,
    });

    return updated;
  }

  async softDelete(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    await this.getById(id);
    await incidentRepository.softDelete(id);
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'Incident',
      entityId: id,
      meta,
    });
  }

  getPdfPath(incident: Awaited<ReturnType<typeof this.getById>>) {
    if (!incident.pdfPath) {
      throw new NotFoundError('PDF not generated for this incident');
    }
    return incidentPdfService.getAbsolutePath(incident.pdfPath);
  }

  private async resolveType(typeId?: string, typeCode?: string) {
    if (typeId) {
      const types = await incidentRepository.listTypes();
      return types.find((t) => t.id === typeId) ?? null;
    }
    if (typeCode) {
      return incidentRepository.findTypeByCode(typeCode);
    }
    return incidentRepository.findTypeByCode('OTHER');
  }

  private async resolveAutoAssignment(roleCode: string): Promise<{
    supervisorId: string | null;
    opsManagerId: string | null;
    assigneeId: string | null;
  }> {
    const activeGroupId = await shiftRosterService.getActiveGroupId();

    if (roleCode === RoleCodes.SECURITY_SUPERVISOR) {
      const ops =
        (activeGroupId
          ? await incidentRepository.findAvailableAssignee(
              RoleCodes.OPERATIONS_MANAGER,
              activeGroupId,
            )
          : null) ??
        (await incidentRepository.findAvailableAssignee(RoleCodes.OPERATIONS_MANAGER));
      return {
        supervisorId: null,
        opsManagerId: ops?.id ?? null,
        assigneeId: ops?.id ?? null,
      };
    }

    const supervisor =
      (activeGroupId
        ? await incidentRepository.findAvailableAssignee(
            RoleCodes.SECURITY_SUPERVISOR,
            activeGroupId,
          )
        : null) ??
      (await incidentRepository.findAvailableAssignee(RoleCodes.SECURITY_SUPERVISOR));
    return {
      supervisorId: supervisor?.id ?? null,
      opsManagerId: null,
      assigneeId: supervisor?.id ?? null,
    };
  }

  private async resolveAssignEscalation(
    roleCode: string,
    existing: Awaited<ReturnType<typeof this.getById>>,
  ): Promise<{
    supervisorId: string | null;
    opsManagerId: string | null;
    assigneeId: string | null;
  }> {
    const activeGroupId = await shiftRosterService.getActiveGroupId();

    if (roleCode === RoleCodes.SECURITY_GUARD) {
      const supervisor =
        (activeGroupId
          ? await incidentRepository.findAvailableAssignee(
              RoleCodes.SECURITY_SUPERVISOR,
              activeGroupId,
            )
          : null) ??
        (await incidentRepository.findAvailableAssignee(RoleCodes.SECURITY_SUPERVISOR));
      return {
        supervisorId: supervisor?.id ?? null,
        opsManagerId: existing.opsManagerId,
        assigneeId: supervisor?.id ?? null,
      };
    }

    if (roleCode === RoleCodes.SECURITY_SUPERVISOR) {
      const ops =
        (activeGroupId
          ? await incidentRepository.findAvailableAssignee(
              RoleCodes.OPERATIONS_MANAGER,
              activeGroupId,
            )
          : null) ??
        (await incidentRepository.findAvailableAssignee(RoleCodes.OPERATIONS_MANAGER));
      return {
        supervisorId: existing.supervisorId,
        opsManagerId: ops?.id ?? null,
        assigneeId: ops?.id ?? null,
      };
    }

    const supervisor =
      (activeGroupId
        ? await incidentRepository.findAvailableAssignee(
            RoleCodes.SECURITY_SUPERVISOR,
            activeGroupId,
          )
        : null) ??
      (await incidentRepository.findAvailableAssignee(RoleCodes.SECURITY_SUPERVISOR));
    if (supervisor) {
      return {
        supervisorId: supervisor.id,
        opsManagerId: existing.opsManagerId,
        assigneeId: supervisor.id,
      };
    }

    const ops =
      (activeGroupId
        ? await incidentRepository.findAvailableAssignee(
            RoleCodes.OPERATIONS_MANAGER,
            activeGroupId,
          )
        : null) ??
      (await incidentRepository.findAvailableAssignee(RoleCodes.OPERATIONS_MANAGER));
    return {
      supervisorId: existing.supervisorId,
      opsManagerId: ops?.id ?? null,
      assigneeId: ops?.id ?? null,
    };
  }

  private assertTransition(from: IncidentStatus, to: IncidentStatus): void {
    const allowed = INCIDENT_STATUS_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new ConflictError(`لا يمكن الانتقال من ${from} إلى ${to}`);
    }
  }
}

export const incidentService = new IncidentService();
