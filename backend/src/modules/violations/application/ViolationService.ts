import {
  AuditAction,
  ParkingLocationCode,
  VehicleViolationStatus,
  ViolationType,
} from '@prisma/client';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/index.js';
import { auditService } from '../../identity/application/AuditService.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { RoleCodes } from '../../identity/domain/roleCodes.js';
import {
  ALLOWED_STATUS_TRANSITIONS,
  RESPONSE_METRIC_KEYS,
} from '../domain/constants.js';
import { CreateViolationData, UpdateViolationData, ViolationListFilters } from '../domain/types.js';
import { violationRepository } from '../infrastructure/ViolationRepository.js';
import { emitCctvRefresh } from '../../cctv/application/cctvRealtime.js';

export interface CreateViolationInput {
  plateNumber: string;
  ocrResult?: string | null;
  ocrConfidence?: number | null;
  arabicPlate?: string | null;
  englishPlate?: string | null;
  vehicleColor?: string | null;
  violationType: ViolationType;
  parkingCode: ParkingLocationCode;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  imagePath?: string | null;
  notes?: string | null;
  clientSyncId?: string | null;
  detectedAt?: Date;
  autoAssign?: boolean;
  supervisorId?: string | null;
  cctvOperatorId?: string | null;
  attachments?: CreateViolationData['attachments'];
}

export interface AssignViolationInput {
  supervisorId?: string | null;
  cctvOperatorId?: string | null;
}

export interface CloseViolationInput {
  notes?: string | null;
  status?: 'RESOLVED' | 'CANCELLED';
}

class ViolationService {
  async list(filters: ViolationListFilters) {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const { rows, total } = await violationRepository.list(filters);
    return {
      data: rows,
      meta: { page, pageSize, total },
    };
  }

  async getById(id: string) {
    const violation = await violationRepository.findById(id);
    if (!violation) throw new NotFoundError('Vehicle violation not found');
    return violation;
  }

  async create(
    actor: AuthenticatedUser,
    input: CreateViolationInput,
    meta: RequestMeta = {},
  ) {
    if (input.clientSyncId) {
      const existing = await violationRepository.findByClientSyncId(input.clientSyncId);
      if (existing) {
        return existing;
      }
    }

    const location = await violationRepository.getLocationByParkingCode(input.parkingCode);
    if (!location) {
      throw new ValidationError(
        `Parking location not configured: ${input.parkingCode}. Run database seed.`,
      );
    }

    const shouldAutoAssign = input.autoAssign !== false;
    let supervisorId = input.supervisorId ?? null;
    let cctvOperatorId = input.cctvOperatorId ?? null;
    let status: VehicleViolationStatus = VehicleViolationStatus.NEW;

    if (shouldAutoAssign && !supervisorId && !cctvOperatorId) {
      const assignment = await this.resolveAutoAssignment();
      supervisorId = assignment.supervisorId;
      cctvOperatorId = assignment.cctvOperatorId;
      if (supervisorId || cctvOperatorId) {
        status = VehicleViolationStatus.ASSIGNED;
      }
    } else if (supervisorId || cctvOperatorId) {
      status = VehicleViolationStatus.ASSIGNED;
    }

    const violation = await violationRepository.create({
      plateNumber: input.plateNumber.trim().toUpperCase(),
      ocrResult: input.ocrResult ?? null,
      ocrConfidence: input.ocrConfidence ?? null,
      arabicPlate: input.arabicPlate ?? null,
      englishPlate: input.englishPlate ?? null,
      vehicleColor: input.vehicleColor ?? null,
      violationType: input.violationType,
      parkingCode: input.parkingCode,
      locationId: location.id,
      gpsLatitude: input.gpsLatitude ?? null,
      gpsLongitude: input.gpsLongitude ?? null,
      imagePath: input.imagePath ?? input.attachments?.[0]?.imagePath ?? null,
      createdById: actor.id,
      supervisorId,
      cctvOperatorId,
      status,
      notes: input.notes ?? null,
      clientSyncId: input.clientSyncId ?? null,
      detectedAt: input.detectedAt,
      attachments: input.attachments,
    });

    await violationRepository.startResponseTime({
      violationId: violation.id,
      actorId: actor.id,
      metricKey: RESPONSE_METRIC_KEYS.TOTAL_RESPONSE,
      startedAt: violation.createdAt,
    });

    if (status === VehicleViolationStatus.ASSIGNED) {
      await auditService.log({
        actorId: actor.id,
        action: AuditAction.ASSIGN,
        entityType: 'VehicleViolation',
        entityId: violation.id,
        metadata: { supervisorId, cctvOperatorId, auto: shouldAutoAssign },
        meta,
      });
    }

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'VehicleViolation',
      entityId: violation.id,
      metadata: {
        plateNumber: violation.plateNumber,
        parkingCode: violation.parkingCode,
        status: violation.status,
        clientSyncId: violation.clientSyncId,
      },
      meta,
    });

    emitCctvRefresh('violation:created', violation.id);

    return violationRepository.findById(violation.id);
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateViolationData,
    meta: RequestMeta = {},
  ) {
    const existing = await this.getById(id);

    if (
      existing.status === VehicleViolationStatus.RESOLVED ||
      existing.status === VehicleViolationStatus.CANCELLED
    ) {
      throw new ConflictError('Closed violations cannot be updated');
    }

    let locationId = input.locationId;
    if (input.parkingCode && input.parkingCode !== existing.parkingCode) {
      const location = await violationRepository.getLocationByParkingCode(input.parkingCode);
      if (!location) {
        throw new ValidationError(`Parking location not configured: ${input.parkingCode}`);
      }
      locationId = location.id;
    }

    if (input.status && input.status !== existing.status) {
      this.assertTransition(existing.status, input.status);
    }

    const updated = await violationRepository.update(id, {
      ...input,
      ...(locationId ? { locationId } : {}),
      ...(input.plateNumber ? { plateNumber: input.plateNumber.trim().toUpperCase() } : {}),
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'VehicleViolation',
      entityId: id,
      metadata: { changedFields: Object.keys(input) },
      meta,
    });

    emitCctvRefresh('violation:updated', id);

    return updated;
  }

  async assign(
    actor: AuthenticatedUser,
    id: string,
    input: AssignViolationInput,
    meta: RequestMeta = {},
  ) {
    const existing = await this.getById(id);

    if (
      existing.status === VehicleViolationStatus.RESOLVED ||
      existing.status === VehicleViolationStatus.CANCELLED
    ) {
      throw new ConflictError('Cannot assign a closed violation');
    }

    let supervisorId = input.supervisorId ?? existing.supervisorId;
    let cctvOperatorId = input.cctvOperatorId ?? existing.cctvOperatorId;

    if (!input.supervisorId && !input.cctvOperatorId) {
      const assignment = await this.resolveAutoAssignment();
      supervisorId = assignment.supervisorId;
      cctvOperatorId = assignment.cctvOperatorId;
    }

    if (!supervisorId && !cctvOperatorId) {
      throw new ValidationError('No available supervisor or CCTV operator to assign');
    }

    // Prefer supervisor when both present from auto-assign
    if (supervisorId && cctvOperatorId && !input.cctvOperatorId && !input.supervisorId) {
      cctvOperatorId = null;
    }

    const updated = await violationRepository.update(id, {
      supervisorId,
      cctvOperatorId: supervisorId ? cctvOperatorId : cctvOperatorId,
      status:
        existing.status === VehicleViolationStatus.NEW
          ? VehicleViolationStatus.ASSIGNED
          : existing.status,
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.ASSIGN,
      entityType: 'VehicleViolation',
      entityId: id,
      metadata: { supervisorId, cctvOperatorId },
      meta,
    });

    return updated;
  }

  async startProgress(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const existing = await this.getById(id);
    this.assertTransition(existing.status, VehicleViolationStatus.IN_PROGRESS);

    const updated = await violationRepository.update(id, {
      status: VehicleViolationStatus.IN_PROGRESS,
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'VehicleViolation',
      entityId: id,
      metadata: { status: VehicleViolationStatus.IN_PROGRESS },
      meta,
    });

    return updated;
  }

  async close(
    actor: AuthenticatedUser,
    id: string,
    input: CloseViolationInput = {},
    meta: RequestMeta = {},
  ) {
    const existing = await this.getById(id);
    const targetStatus =
      input.status === 'CANCELLED'
        ? VehicleViolationStatus.CANCELLED
        : VehicleViolationStatus.RESOLVED;

    if (
      existing.status === VehicleViolationStatus.RESOLVED ||
      existing.status === VehicleViolationStatus.CANCELLED
    ) {
      throw new ConflictError('Violation is already closed');
    }

    // Supervisors close violations; directors/ops managers also allowed via permission middleware
    if (
      targetStatus === VehicleViolationStatus.RESOLVED &&
      actor.roleCode === RoleCodes.SECURITY_GUARD
    ) {
      throw new ForbiddenError('Security guards cannot close violations');
    }

    this.assertTransition(existing.status, targetStatus);

    const closedAt = new Date();
    const updated = await violationRepository.update(id, {
      status: targetStatus,
      closedAt,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    });

    await violationRepository.closeOpenResponseTimes(id, closedAt, actor.id);

    await auditService.log({
      actorId: actor.id,
      action: targetStatus === VehicleViolationStatus.RESOLVED ? AuditAction.APPROVE : AuditAction.UPDATE,
      entityType: 'VehicleViolation',
      entityId: id,
      metadata: {
        status: targetStatus,
        closedAt: closedAt.toISOString(),
        responseClosed: true,
      },
      meta,
    });

    emitCctvRefresh('violation:closed', id);

    return violationRepository.findById(id) ?? updated;
  }

  async addAttachments(
    actor: AuthenticatedUser,
    id: string,
    attachments: NonNullable<CreateViolationData['attachments']>,
    meta: RequestMeta = {},
  ) {
    const existing = await this.getById(id);
    if (
      existing.status === VehicleViolationStatus.RESOLVED ||
      existing.status === VehicleViolationStatus.CANCELLED
    ) {
      throw new ConflictError('Cannot attach images to a closed violation');
    }

    if (!attachments.length) {
      throw new ValidationError('At least one attachment is required');
    }

    const updated = await violationRepository.addAttachments(id, attachments);

    if (!existing.imagePath && attachments[0]?.imagePath) {
      await violationRepository.update(id, { imagePath: attachments[0].imagePath });
    }

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'VehicleViolation',
      entityId: id,
      metadata: { attachmentsAdded: attachments.length },
      meta,
    });

    return violationRepository.findById(id) ?? updated;
  }

  async softDelete(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    await this.getById(id);
    await violationRepository.softDelete(id);
    await auditService.log({
      actorId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'VehicleViolation',
      entityId: id,
      meta,
    });
  }

  private async resolveAutoAssignment(): Promise<{
    supervisorId: string | null;
    cctvOperatorId: string | null;
  }> {
    const supervisor = await violationRepository.findAvailableAssignee(
      RoleCodes.SECURITY_SUPERVISOR,
    );
    if (supervisor) {
      return { supervisorId: supervisor.id, cctvOperatorId: null };
    }

    const operator = await violationRepository.findAvailableAssignee(RoleCodes.CCTV_OPERATOR);
    return {
      supervisorId: null,
      cctvOperatorId: operator?.id ?? null,
    };
  }

  private assertTransition(from: VehicleViolationStatus, to: VehicleViolationStatus): void {
    const allowed = ALLOWED_STATUS_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new ConflictError(`Invalid status transition: ${from} → ${to}`);
    }
  }
}

export const violationService = new ViolationService();
