import { AuditAction, ComplaintStatus } from '@prisma/client';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/index.js';
import { auditService } from '../../identity/application/AuditService.js';
import { authorizationService } from '../../identity/application/AuthorizationService.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { prisma } from '../../../shared/database/prisma.js';
import { ComplaintListFilters } from '../domain/types.js';
import { complaintRepository } from '../infrastructure/ComplaintRepository.js';
import { emitComplaintRefresh } from './complaintRealtime.js';

export interface CreateComplaintInput {
  title: string;
  description: string;
  locationId?: string | null;
}

export interface UpdateComplaintInput {
  title?: string;
  description?: string;
}

export interface ReviewComplaintInput {
  status: ComplaintStatus;
  reviewNotes?: string | null;
}

const REVIEW_STATUSES: ComplaintStatus[] = [
  ComplaintStatus.APPROVED,
  ComplaintStatus.REJECTED,
  ComplaintStatus.UNDER_REVIEW,
  ComplaintStatus.CLOSED,
];

class ComplaintService {
  async list(filters: ComplaintListFilters) {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const { rows, total } = await complaintRepository.list(filters);
    return {
      data: rows,
      meta: { page, pageSize, total },
    };
  }

  async getById(id: string) {
    const complaint = await complaintRepository.findById(id);
    if (!complaint) throw new NotFoundError('Complaint not found');
    return complaint;
  }

  async create(
    actor: AuthenticatedUser,
    input: CreateComplaintInput,
    meta: RequestMeta = {},
  ) {
    if (input.locationId) {
      const location = await prisma.location.findFirst({
        where: { id: input.locationId, deletedAt: null },
      });
      if (!location) throw new NotFoundError('Location not found');
    }

    const complaint = await complaintRepository.create({
      title: input.title.trim(),
      description: input.description.trim(),
      locationId: input.locationId ?? null,
      submitterId: actor.id,
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'Complaint',
      entityId: complaint.id,
      metadata: { status: complaint.status },
      meta,
    });

    emitComplaintRefresh('created', complaint.id);
    return complaint;
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    input: UpdateComplaintInput,
    meta: RequestMeta = {},
  ) {
    const existing = await complaintRepository.findById(id);
    if (!existing) throw new NotFoundError('Complaint not found');

    if (existing.status === ComplaintStatus.CLOSED) {
      throw new ValidationError('Cannot update a closed complaint');
    }

    const complaint = await complaintRepository.update(id, {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description.trim() } : {}),
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Complaint',
      entityId: complaint.id,
      metadata: { changedFields: Object.keys(input) },
      meta,
    });

    return complaint;
  }

  async review(
    actor: AuthenticatedUser,
    id: string,
    input: ReviewComplaintInput,
    meta: RequestMeta = {},
  ) {
    if (!REVIEW_STATUSES.includes(input.status)) {
      throw new ValidationError('Invalid review status');
    }

    await this.assertReviewPermission(actor, input.status);

    const existing = await complaintRepository.findById(id);
    if (!existing) throw new NotFoundError('Complaint not found');

    if (existing.status === ComplaintStatus.CLOSED) {
      throw new ValidationError('Complaint is already closed');
    }

    const complaint = await complaintRepository.review(id, {
      status: input.status,
      reviewerId: actor.id,
      reviewNotes: input.reviewNotes ?? null,
    });

    const action =
      input.status === ComplaintStatus.APPROVED
        ? AuditAction.APPROVE
        : input.status === ComplaintStatus.REJECTED
          ? AuditAction.REJECT
          : AuditAction.UPDATE;

    await auditService.log({
      actorId: actor.id,
      action,
      entityType: 'Complaint',
      entityId: complaint.id,
      metadata: { status: input.status, reviewNotes: input.reviewNotes ?? null },
      meta,
    });

    emitComplaintRefresh('reviewed', complaint.id);
    return complaint;
  }

  private async assertReviewPermission(
    actor: AuthenticatedUser,
    status: ComplaintStatus,
  ): Promise<void> {
    let required: string;
    switch (status) {
      case ComplaintStatus.APPROVED:
        required = PermissionCodes.COMPLAINTS_APPROVE;
        break;
      case ComplaintStatus.REJECTED:
        required = PermissionCodes.COMPLAINTS_REJECT;
        break;
      default:
        required = PermissionCodes.COMPLAINTS_UPDATE;
    }

    const allowed = await authorizationService.hasAllPermissions(actor, [required], {});
    if (!allowed) {
      throw new ForbiddenError(`Missing required permission: ${required}`);
    }
  }
}

export const complaintService = new ComplaintService();
