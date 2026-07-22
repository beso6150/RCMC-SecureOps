import { AuditAction, CameraRequestStatus } from '@prisma/client';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/index.js';
import { auditService } from '../../identity/application/AuditService.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { CompleteCameraRequestData, CameraRequestListFilters } from '../domain/types.js';
import { cameraRequestRepository } from '../infrastructure/CameraRequestRepository.js';
import { vehiclePermitRepository } from '../infrastructure/VehiclePermitRepository.js';
import { emitCameraRequestUpdated, emitCctvRefresh } from './cctvRealtime.js';

export interface CreateCameraRequestInput {
  plateNumber: string;
  notes?: string | null;
}

const ACTIVE_STATUSES: CameraRequestStatus[] = [
  CameraRequestStatus.PENDING,
  CameraRequestStatus.IN_PROGRESS,
];

class CameraRequestService {
  async list(actor: AuthenticatedUser, filters: CameraRequestListFilters) {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);

    const resolved: CameraRequestListFilters = {
      ...filters,
      page,
      pageSize,
      ...(filters.mine ? { requestedById: actor.id } : {}),
    };

    const { rows, total } = await cameraRequestRepository.list(resolved);
    return {
      data: rows,
      meta: { page, pageSize, total },
    };
  }

  async getById(id: string) {
    const request = await cameraRequestRepository.findById(id);
    if (!request) throw new NotFoundError('Camera request not found');
    return request;
  }

  async create(
    actor: AuthenticatedUser,
    input: CreateCameraRequestInput,
    meta: RequestMeta = {},
  ) {
    const plateNumber = input.plateNumber.trim().toUpperCase();
    if (plateNumber.length < 2) {
      throw new ValidationError('plateNumber is required (min 2 characters)');
    }

    const request = await cameraRequestRepository.create({
      plateNumber,
      notes: input.notes ?? null,
      requestedById: actor.id,
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'CameraRequest',
      entityId: request.id,
      metadata: { plateNumber: request.plateNumber, status: request.status },
      meta,
    });

    emitCameraRequestUpdated(request);
    emitCctvRefresh('camera_request:created', request.id);

    return request;
  }

  async start(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const existing = await this.getById(id);

    if (existing.status === CameraRequestStatus.COMPLETED) {
      throw new ConflictError('Camera request is already completed');
    }
    if (existing.status === CameraRequestStatus.CANCELLED) {
      throw new ConflictError('Camera request is cancelled');
    }
    if (
      existing.status === CameraRequestStatus.IN_PROGRESS &&
      existing.assignedOperatorId &&
      existing.assignedOperatorId !== actor.id
    ) {
      throw new ConflictError('Camera request is already being handled by another operator');
    }
    if (existing.status === CameraRequestStatus.IN_PROGRESS && existing.assignedOperatorId === actor.id) {
      return existing;
    }

    const startedAt = new Date();
    const updated = await cameraRequestRepository.start(id, actor.id, startedAt);

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.ASSIGN,
      entityType: 'CameraRequest',
      entityId: id,
      metadata: { status: CameraRequestStatus.IN_PROGRESS, assignedOperatorId: actor.id },
      meta,
    });

    emitCameraRequestUpdated(updated);
    emitCctvRefresh('camera_request:started', id);

    return updated;
  }

  async complete(
    actor: AuthenticatedUser,
    id: string,
    input: CompleteCameraRequestData = {},
    meta: RequestMeta = {},
  ) {
    const existing = await this.getById(id);

    if (existing.status === CameraRequestStatus.COMPLETED) {
      throw new ConflictError('Camera request is already completed');
    }
    if (existing.status === CameraRequestStatus.CANCELLED) {
      throw new ConflictError('Camera request is cancelled');
    }
    if (!ACTIVE_STATUSES.includes(existing.status)) {
      throw new ConflictError('Camera request cannot be completed from current status');
    }

    if (
      existing.assignedOperatorId &&
      existing.assignedOperatorId !== actor.id
    ) {
      throw new ForbiddenError('Only the assigned operator can complete this request');
    }

    let response: CompleteCameraRequestData = { ...input };

    if (input.permitId) {
      const permit = await vehiclePermitRepository.findById(input.permitId);
      if (!permit) {
        throw new NotFoundError('Vehicle permit not found');
      }
      response = {
        employeeName: response.employeeName ?? permit.ownerName,
        departmentName: response.departmentName ?? permit.location?.nameEn ?? null,
        phone: response.phone ?? permit.ownerPhone,
        permitStatus: response.permitStatus ?? permit.status,
        vehicleType: response.vehicleType ?? permit.vehicleType,
        ownerName: response.ownerName ?? permit.ownerName,
        permitId: permit.id,
        responseNotes: response.responseNotes,
      };
    } else if (
      !response.permitStatus &&
      !response.employeeName &&
      !response.ownerName
    ) {
      response.permitStatus = 'NOT_FOUND';
    }

    const completedAt = new Date();
    const startMs = (existing.startedAt ?? existing.createdAt).getTime();
    const responseTimeMs = Math.max(0, completedAt.getTime() - startMs);

    const updated = await cameraRequestRepository.complete(id, {
      ...response,
      completedAt,
      responseTimeMs,
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.APPROVE,
      entityType: 'CameraRequest',
      entityId: id,
      metadata: {
        status: CameraRequestStatus.COMPLETED,
        responseTimeMs,
        permitId: updated.permitId,
        permitStatus: updated.permitStatus,
      },
      meta,
    });

    emitCameraRequestUpdated(updated);
    emitCctvRefresh('camera_request:completed', id);

    return updated;
  }

  async cancel(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const existing = await this.getById(id);

    if (existing.status === CameraRequestStatus.COMPLETED) {
      throw new ConflictError('Completed camera requests cannot be cancelled');
    }
    if (existing.status === CameraRequestStatus.CANCELLED) {
      return existing;
    }

    const updated = await cameraRequestRepository.cancel(id);

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'CameraRequest',
      entityId: id,
      metadata: { status: CameraRequestStatus.CANCELLED },
      meta,
    });

    emitCameraRequestUpdated(updated);
    emitCctvRefresh('camera_request:cancelled', id);

    return updated;
  }
}

export const cameraRequestService = new CameraRequestService();
