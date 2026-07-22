import {
  AttachmentType,
  AuditAction,
  IncidentAssignmentType,
  IncidentContactType,
  IncidentFollowUpStatus,
  IncidentHistoryAction,
  IncidentNoteType,
  IncidentNoteVisibility,
  IncidentSeverity,
  IncidentSource,
  IncidentStatus,
  IncidentTaskStatus,
  NotificationPriority,
  Prisma,
} from '@prisma/client';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/index.js';
import { prisma } from '../../../shared/database/prisma.js';
import { broadcast } from '../../../shared/realtime/socketServer.js';
import { auditService } from '../../identity/application/AuditService.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { RoleCodes } from '../../identity/domain/roleCodes.js';
import { notificationService } from '../../notifications/application/NotificationService.js';
import { fieldOperationsService } from '../../field-operations/application/FieldOperationsService.js';
import { SLA_HOURS_BY_SEVERITY } from '../domain/constants.js';
import { incidentRepository } from '../infrastructure/IncidentRepository.js';
import { nextIncidentNumber } from './incidentNumbering.js';
import {
  assertCanCloseIncident,
  assertFalseAlarmReason,
  assertIncidentTransition,
  assertNotTerminal,
  mapRoleToIncidentSource,
} from './incidentLifecycle.js';
import { readIncidentFile, saveIncidentFile } from './IncidentStorage.js';
import { operationsRoomService } from './OperationsRoomService.js';

function withAssignedAlias<T extends { assigneeId?: string | null }>(row: T) {
  return { ...row, assignedUserId: row.assigneeId ?? null };
}

function refreshOps(reason: string, incidentId: string) {
  broadcast('operations-room:refresh', { reason, incidentId });
}

class IncidentOpsService {
  async getDetailed(id: string) {
    const incident = await prisma.incident.findFirst({
      where: { id, deletedAt: null },
      include: {
        type: true,
        floor: true,
        meetingRoom: true,
        location: true,
        zone: true,
        checkpoint: true,
        shift: true,
        reporter: { select: { id: true, fullName: true, employeeNumber: true } },
        assignee: { select: { id: true, fullName: true, employeeNumber: true } },
        supervisor: { select: { id: true, fullName: true, employeeNumber: true } },
        opsManager: { select: { id: true, fullName: true, employeeNumber: true } },
        acknowledgedBy: { select: { id: true, fullName: true, employeeNumber: true } },
        assessedBy: { select: { id: true, fullName: true, employeeNumber: true } },
        closedBy: { select: { id: true, fullName: true, employeeNumber: true } },
        attachments: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, fullName: true, employeeNumber: true } } },
        },
        history: {
          orderBy: { createdAt: 'asc' },
          include: { actor: { select: { id: true, fullName: true, employeeNumber: true } } },
        },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: {
            assignedUser: { select: { id: true, fullName: true, employeeNumber: true } },
            assignedBy: { select: { id: true, fullName: true, employeeNumber: true } },
          },
        },
        notesList: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: { createdBy: { select: { id: true, fullName: true, employeeNumber: true } } },
        },
        contactLogs: {
          orderBy: { contactedAt: 'desc' },
          include: { contactedBy: { select: { id: true, fullName: true, employeeNumber: true } } },
        },
        tasks: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        followUps: {
          where: { deletedAt: null },
          orderBy: { dueAt: 'asc' },
        },
        procedureSteps: { orderBy: { stepIndex: 'asc' } },
      },
    });
    if (!incident) throw new NotFoundError('البلاغ غير موجود');
    return withAssignedAlias(incident);
  }

  async acknowledge(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const existing = await this.requireIncident(id);
    assertNotTerminal(existing.status, 'اعتماد');
    const next = IncidentStatus.ACKNOWLEDGED;
    assertIncidentTransition(existing.status, next);

    const updated = await prisma.incident.update({
      where: { id },
      data: {
        status: next,
        acknowledgedById: actor.id,
        acknowledgedAt: new Date(),
      },
    });

    await this.history(id, IncidentHistoryAction.ACKNOWLEDGED, actor.id, existing.status, next);
    await this.audit(actor, id, { status: next }, meta);
    broadcast('incident:acknowledged', { incidentId: id });
    refreshOps('incident:acknowledged', id);
    return withAssignedAlias(updated);
  }

  async assess(
    actor: AuthenticatedUser,
    id: string,
    input: { assessmentJson?: Prisma.InputJsonValue; notes?: string | null },
    meta: RequestMeta = {},
  ) {
    const existing = await this.requireIncident(id);
    assertNotTerminal(existing.status, 'تقييم');
    const next = IncidentStatus.ASSESSING;
    if (existing.status !== IncidentStatus.ASSESSING) {
      assertIncidentTransition(existing.status, next);
    }

    const updated = await prisma.incident.update({
      where: { id },
      data: {
        status: next,
        assessedById: actor.id,
        assessedAt: new Date(),
        ...(input.assessmentJson !== undefined ? { assessmentJson: input.assessmentJson } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });

    await this.history(
      id,
      IncidentHistoryAction.ASSESSMENT_ADDED,
      actor.id,
      existing.status,
      next,
      input.notes,
    );
    await this.audit(actor, id, { status: next }, meta);
    broadcast('incident:assessed', { incidentId: id });
    refreshOps('incident:assessed', id);
    return withAssignedAlias(updated);
  }

  async assignOps(
    actor: AuthenticatedUser,
    id: string,
    input: {
      assignedUserId?: string | null;
      assignedGroupId?: string | null;
      assignmentType?: IncidentAssignmentType;
      reason?: string | null;
      supervisorId?: string | null;
      opsManagerId?: string | null;
    },
    meta: RequestMeta = {},
  ) {
    const existing = await this.requireIncident(id);
    assertNotTerminal(existing.status, 'إسناد');

    const assigneeId = input.assignedUserId ?? existing.assigneeId;
    if (!assigneeId && !input.assignedGroupId) {
      throw new ValidationError('يجب تحديد مستخدم أو مجموعة للإسناد');
    }

    const next =
      existing.status === IncidentStatus.NEW ||
      existing.status === IncidentStatus.REPORTED ||
      existing.status === IncidentStatus.ACKNOWLEDGED ||
      existing.status === IncidentStatus.ASSESSING ||
      existing.status === IncidentStatus.REOPENED ||
      existing.status === IncidentStatus.ESCALATED
        ? IncidentStatus.ASSIGNED
        : existing.status;

    if (next !== existing.status) assertIncidentTransition(existing.status, next);

    const now = new Date();
    const updated = await prisma.incident.update({
      where: { id },
      data: {
        status: next,
        assigneeId: assigneeId ?? null,
        assignedGroupId: input.assignedGroupId ?? existing.assignedGroupId,
        assignedById: actor.id,
        assignedAt: now,
        ...(input.supervisorId !== undefined ? { supervisorId: input.supervisorId } : {}),
        ...(input.opsManagerId !== undefined ? { opsManagerId: input.opsManagerId } : {}),
      },
    });

    await prisma.incidentAssignment.create({
      data: {
        incidentId: id,
        assignedUserId: assigneeId ?? null,
        assignedGroupId: input.assignedGroupId ?? null,
        assignedById: actor.id,
        assignmentType: input.assignmentType ?? IncidentAssignmentType.PRIMARY,
        reason: input.reason ?? null,
        assignedAt: now,
      },
    });

    await this.history(id, IncidentHistoryAction.ASSIGNED, actor.id, existing.status, next, input.reason);
    await this.audit(actor, id, { assigneeId, action: 'assign' }, meta, AuditAction.ASSIGN);

    if (assigneeId) {
      await notificationService.create({
        userId: assigneeId,
        senderId: actor.id,
        title: `إسناد بلاغ ${updated.incidentNumber ?? id.slice(0, 8)}`,
        body: input.reason?.trim() || 'تم إسناد بلاغ أمني إليك',
        priority:
          updated.severity === IncidentSeverity.CRITICAL || updated.severity === IncidentSeverity.HIGH
            ? NotificationPriority.HIGH
            : NotificationPriority.NORMAL,
        entityType: 'Incident',
        entityId: id,
      });
    }

    broadcast('incident:assigned', { incidentId: id, assignedUserId: assigneeId });
    refreshOps('incident:assigned', id);
    return withAssignedAlias(updated);
  }

  async reassign(
    actor: AuthenticatedUser,
    id: string,
    input: {
      assignedUserId: string;
      reason?: string | null;
      assignmentType?: IncidentAssignmentType;
    },
    meta: RequestMeta = {},
  ) {
    const existing = await this.requireIncident(id);
    assertNotTerminal(existing.status, 'إعادة إسناد');
    if (!input.assignedUserId) throw new ValidationError('المسند إليه مطلوب');

    await prisma.incidentAssignment.updateMany({
      where: { incidentId: id, endedAt: null, assignmentType: IncidentAssignmentType.PRIMARY },
      data: { endedAt: new Date() },
    });

    const now = new Date();
    const updated = await prisma.incident.update({
      where: { id },
      data: {
        assigneeId: input.assignedUserId,
        assignedById: actor.id,
        assignedAt: now,
        status:
          existing.status === IncidentStatus.NEW || existing.status === IncidentStatus.REPORTED
            ? IncidentStatus.ASSIGNED
            : existing.status,
      },
    });

    await prisma.incidentAssignment.create({
      data: {
        incidentId: id,
        assignedUserId: input.assignedUserId,
        assignedById: actor.id,
        assignmentType: input.assignmentType ?? IncidentAssignmentType.PRIMARY,
        reason: input.reason ?? null,
        assignedAt: now,
      },
    });

    await this.history(
      id,
      IncidentHistoryAction.REASSIGNED,
      actor.id,
      existing.status,
      updated.status,
      input.reason,
      { previousAssigneeId: existing.assigneeId, assignedUserId: input.assignedUserId },
    );
    await this.audit(actor, id, { assignedUserId: input.assignedUserId }, meta, AuditAction.ASSIGN);

    await notificationService.create({
      userId: input.assignedUserId,
      senderId: actor.id,
      title: `إعادة إسناد بلاغ ${updated.incidentNumber ?? id.slice(0, 8)}`,
      body: input.reason?.trim() || 'تمت إعادة إسناد بلاغ أمني إليك',
      priority: NotificationPriority.HIGH,
      entityType: 'Incident',
      entityId: id,
    });

    broadcast('incident:reassigned', { incidentId: id, assignedUserId: input.assignedUserId });
    refreshOps('incident:reassigned', id);
    return withAssignedAlias(updated);
  }

  async respond(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    return this.transitionSimple(
      actor,
      id,
      IncidentStatus.RESPONDING,
      IncidentHistoryAction.RESPONSE_STARTED,
      { responseStartedAt: new Date(), startedAt: new Date() },
      'incident:responding',
      meta,
    );
  }

  async arrive(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    return this.transitionSimple(
      actor,
      id,
      IncidentStatus.ON_SCENE,
      IncidentHistoryAction.ARRIVED,
      { arrivedAt: new Date() },
      'incident:arrived',
      meta,
    );
  }

  async contain(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    return this.transitionSimple(
      actor,
      id,
      IncidentStatus.CONTAINED,
      IncidentHistoryAction.CONTAINED,
      { containedAt: new Date() },
      'incident:contained',
      meta,
    );
  }

  async resolve(
    actor: AuthenticatedUser,
    id: string,
    input: {
      resolutionSummary?: string | null;
      rootCause?: string | null;
      actionsTaken?: string | null;
      recommendations?: string | null;
      requiresFollowUp?: boolean;
      followUpDueAt?: Date | null;
    } = {},
    meta: RequestMeta = {},
  ) {
    const existing = await this.requireIncident(id);
    assertNotTerminal(existing.status, 'حل');
    const next = IncidentStatus.RESOLVED;
    assertIncidentTransition(existing.status, next);

    const resolvedAt = new Date();
    const updated = await prisma.incident.update({
      where: { id },
      data: {
        status: next,
        resolvedAt,
        resolutionSummary: input.resolutionSummary ?? existing.resolutionSummary,
        rootCause: input.rootCause ?? existing.rootCause,
        actionsTaken: input.actionsTaken ?? existing.actionsTaken,
        recommendations: input.recommendations ?? existing.recommendations,
        requiresFollowUp: input.requiresFollowUp ?? existing.requiresFollowUp,
        followUpDueAt: input.followUpDueAt ?? existing.followUpDueAt,
      },
    });

    await this.history(
      id,
      IncidentHistoryAction.RESOLVED,
      actor.id,
      existing.status,
      next,
      input.resolutionSummary,
    );
    await this.audit(actor, id, { status: next }, meta);
    broadcast('incident:resolved', { incidentId: id });
    refreshOps('incident:resolved', id);
    return withAssignedAlias(updated);
  }

  async closeOps(
    actor: AuthenticatedUser,
    id: string,
    input: { notes?: string | null } = {},
    meta: RequestMeta = {},
  ) {
    const existing = await this.requireIncident(id);
    if (existing.status === IncidentStatus.CLOSED) {
      throw new ConflictError('البلاغ مغلق مسبقاً');
    }

    assertCanCloseIncident({
      roleCode: actor.roleCode,
      severity: existing.severity,
      fromStatus: existing.status,
    });

    const closedAt = new Date();
    const startMs = (existing.startedAt ?? existing.occurredAt).getTime();
    const durationMs = Math.max(0, closedAt.getTime() - startMs);

    const updated = await prisma.incident.update({
      where: { id },
      data: {
        status: IncidentStatus.CLOSED,
        closedAt,
        resolvedAt: existing.resolvedAt ?? closedAt,
        closedById: actor.id,
        durationMs,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });

    await incidentRepository.closeOpenResponseTimes(id, closedAt, actor.id);
    await this.history(
      id,
      IncidentHistoryAction.CLOSED,
      actor.id,
      existing.status,
      IncidentStatus.CLOSED,
      input.notes,
      { durationMs },
    );
    await this.audit(actor, id, { status: IncidentStatus.CLOSED }, meta, AuditAction.APPROVE);
    broadcast('incident:closed', { incidentId: id });
    refreshOps('incident:closed', id);
    return withAssignedAlias(updated);
  }

  async reopen(
    actor: AuthenticatedUser,
    id: string,
    input: { reason?: string | null } = {},
    meta: RequestMeta = {},
  ) {
    const existing = await this.requireIncident(id);
    const next = IncidentStatus.REOPENED;
    assertIncidentTransition(existing.status, next);

    const updated = await prisma.incident.update({
      where: { id },
      data: {
        status: next,
        closedAt: null,
        cancelledAt: null,
        closedById: null,
      },
    });

    await this.history(
      id,
      IncidentHistoryAction.REOPENED,
      actor.id,
      existing.status,
      next,
      input.reason,
    );
    await this.audit(actor, id, { status: next }, meta);
    broadcast('incident:reopened', { incidentId: id });
    refreshOps('incident:reopened', id);
    return withAssignedAlias(updated);
  }

  async cancelOps(
    actor: AuthenticatedUser,
    id: string,
    input: { reason?: string | null } = {},
    meta: RequestMeta = {},
  ) {
    const existing = await this.requireIncident(id);
    assertNotTerminal(existing.status, 'إلغاء');
    const next = IncidentStatus.CANCELLED;
    assertIncidentTransition(existing.status, next);

    const cancelledAt = new Date();
    const updated = await prisma.incident.update({
      where: { id },
      data: {
        status: next,
        cancelledAt,
        closedAt: cancelledAt,
        cancellationReason: input.reason?.trim() || null,
      },
    });

    await incidentRepository.closeOpenResponseTimes(id, cancelledAt, actor.id);
    await this.history(id, IncidentHistoryAction.CANCELLED, actor.id, existing.status, next, input.reason);
    await this.audit(actor, id, { status: next }, meta);
    broadcast('incident:cancelled', { incidentId: id });
    refreshOps('incident:cancelled', id);
    return withAssignedAlias(updated);
  }

  async falseAlarm(
    actor: AuthenticatedUser,
    id: string,
    input: { reason: string },
    meta: RequestMeta = {},
  ) {
    const existing = await this.requireIncident(id);
    assertNotTerminal(existing.status, 'تعليم تسجيل إنذار كاذب');
    const reason = assertFalseAlarmReason(input.reason);
    const next = IncidentStatus.FALSE_ALARM;
    assertIncidentTransition(existing.status, next);

    const closedAt = new Date();
    const updated = await prisma.incident.update({
      where: { id },
      data: {
        status: next,
        falseAlarmReason: reason,
        closedAt,
        closedById: actor.id,
      },
    });

    await incidentRepository.closeOpenResponseTimes(id, closedAt, actor.id);
    await this.history(id, IncidentHistoryAction.FALSE_ALARM, actor.id, existing.status, next, reason);
    await this.audit(actor, id, { status: next }, meta);
    broadcast('incident:false-alarm', { incidentId: id });
    refreshOps('incident:false-alarm', id);
    return withAssignedAlias(updated);
  }

  async escalate(
    actor: AuthenticatedUser,
    id: string,
    input: { reason?: string | null } = {},
    meta: RequestMeta = {},
  ) {
    const existing = await this.requireIncident(id);
    assertNotTerminal(existing.status, 'تصعيد');
    const next = IncidentStatus.ESCALATED;
    assertIncidentTransition(existing.status, next);

    const reason = input.reason?.trim() || 'تم تصعيد البلاغ';
    const updated = await prisma.incident.update({
      where: { id },
      data: {
        status: next,
        escalatedAt: new Date(),
        escalationReason: reason,
        escalationLevel: { increment: 1 },
      },
    });

    await this.history(id, IncidentHistoryAction.ESCALATED, actor.id, existing.status, next, reason);
    await this.audit(actor, id, { status: next, reason }, meta);

    const targets = await prisma.user.findMany({
      where: {
        deletedAt: null,
        role: {
          code: { in: [RoleCodes.SECURITY_SUPERVISOR, RoleCodes.OPERATIONS_MANAGER] },
          deletedAt: null,
        },
      },
      select: { id: true },
      take: 30,
    });

    for (const u of targets) {
      await notificationService.create({
        userId: u.id,
        senderId: actor.id,
        title: `تصعيد بلاغ ${updated.incidentNumber ?? id.slice(0, 8)}`,
        body: reason,
        priority: NotificationPriority.HIGH,
        entityType: 'Incident',
        entityId: id,
      });
    }

    broadcast('incident:escalated', { incidentId: id });
    broadcast('operations-room:critical-alert', {
      incidentId: id,
      severity: updated.severity,
      reason,
    });
    refreshOps('incident:escalated', id);
    return withAssignedAlias(updated);
  }

  async requestSupport(
    actor: AuthenticatedUser,
    id: string,
    input: {
      assignedUserId?: string | null;
      assignedGroupId?: string | null;
      assignmentType?: IncidentAssignmentType;
      reason?: string | null;
    },
    meta: RequestMeta = {},
  ) {
    const existing = await this.requireIncident(id);
    assertNotTerminal(existing.status, 'طلب مؤازرة');

    const assignment = await prisma.incidentAssignment.create({
      data: {
        incidentId: id,
        assignedUserId: input.assignedUserId ?? null,
        assignedGroupId: input.assignedGroupId ?? null,
        assignedById: actor.id,
        assignmentType: input.assignmentType ?? IncidentAssignmentType.SUPPORT,
        reason: input.reason ?? null,
      },
    });

    await this.history(
      id,
      IncidentHistoryAction.SUPPORT_REQUESTED,
      actor.id,
      existing.status,
      existing.status,
      input.reason,
      { assignmentId: assignment.id },
    );
    await this.audit(actor, id, { assignmentId: assignment.id }, meta);

    if (input.assignedUserId) {
      await notificationService.create({
        userId: input.assignedUserId,
        senderId: actor.id,
        title: `طلب مؤازرة — ${existing.incidentNumber ?? id.slice(0, 8)}`,
        body: input.reason?.trim() || 'مطلوب دعم ميداني',
        priority: NotificationPriority.HIGH,
        entityType: 'Incident',
        entityId: id,
      });
    }

    broadcast('incident:support-requested', { incidentId: id });
    refreshOps('incident:support-requested', id);
    return assignment;
  }

  async addNote(
    actor: AuthenticatedUser,
    id: string,
    input: {
      content: string;
      noteType?: IncidentNoteType;
      visibility?: IncidentNoteVisibility;
    },
    meta: RequestMeta = {},
  ) {
    const existing = await this.requireIncident(id);
    const content = input.content?.trim();
    if (!content) throw new ValidationError('محتوى الملاحظة مطلوب');

    const noteType = input.noteType ?? IncidentNoteType.GENERAL;
    const visibility = input.visibility ?? IncidentNoteVisibility.ALL_AUTHORIZED;

    if (
      (noteType === IncidentNoteType.CONFIDENTIAL ||
        visibility === IncidentNoteVisibility.DIRECTORS_ONLY) &&
      actor.roleCode !== RoleCodes.SECURITY_DIRECTOR &&
      actor.roleCode !== RoleCodes.OPERATIONS_MANAGER
    ) {
      throw new ForbiddenError('لا صلاحية لإضافة ملاحظات سرية');
    }

    if (
      noteType === IncidentNoteType.CCTV_NOTE &&
      actor.roleCode !== RoleCodes.CCTV_OPERATOR &&
      actor.roleCode !== RoleCodes.SECURITY_DIRECTOR &&
      actor.roleCode !== RoleCodes.OPERATIONS_MANAGER
    ) {
      throw new ForbiddenError('ملاحظات CCTV مخصصة لمشغلة المراقبة');
    }

    const note = await prisma.incidentNote.create({
      data: {
        incidentId: id,
        content,
        noteType,
        visibility,
        createdById: actor.id,
      },
      include: { createdBy: { select: { id: true, fullName: true, employeeNumber: true } } },
    });

    await this.history(id, IncidentHistoryAction.NOTE_ADDED, actor.id, existing.status, existing.status, content.slice(0, 500));
    await this.audit(actor, id, { noteId: note.id }, meta);
    broadcast('incident:note-added', { incidentId: id, noteId: note.id });
    return note;
  }

  async listNotes(actor: AuthenticatedUser, id: string) {
    await this.requireIncident(id);
    const notes = await prisma.incidentNote.findMany({
      where: { incidentId: id, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: { createdBy: { select: { id: true, fullName: true, employeeNumber: true } } },
    });

    return notes.filter((n) => this.canViewNote(actor, n.visibility, n.noteType));
  }

  async addContactLog(
    actor: AuthenticatedUser,
    id: string,
    input: {
      contactType: IncidentContactType;
      organizationName?: string | null;
      contactPerson?: string | null;
      phoneNumberMasked?: string | null;
      result: string;
      referenceNumber?: string | null;
      notes?: string | null;
      contactedAt?: Date;
    },
    meta: RequestMeta = {},
  ) {
    const existing = await this.requireIncident(id);
    if (!input.result?.trim()) throw new ValidationError('نتيجة الاتصال مطلوبة');

    const row = await prisma.incidentContactLog.create({
      data: {
        incidentId: id,
        contactType: input.contactType,
        organizationName: input.organizationName ?? null,
        contactPerson: input.contactPerson ?? null,
        phoneNumberMasked: input.phoneNumberMasked ?? null,
        contactedById: actor.id,
        contactedAt: input.contactedAt ?? new Date(),
        result: input.result.trim(),
        referenceNumber: input.referenceNumber ?? null,
        notes: input.notes ?? null,
      },
    });

    await this.history(id, IncidentHistoryAction.CONTACT_LOGGED, actor.id, existing.status, existing.status);
    await this.audit(actor, id, { contactLogId: row.id }, meta);
    broadcast('incident:contact-logged', { incidentId: id });
    return row;
  }

  async listContactLogs(id: string) {
    await this.requireIncident(id);
    return prisma.incidentContactLog.findMany({
      where: { incidentId: id },
      orderBy: { contactedAt: 'desc' },
      include: { contactedBy: { select: { id: true, fullName: true, employeeNumber: true } } },
    });
  }

  async addTask(
    actor: AuthenticatedUser,
    id: string,
    input: {
      title: string;
      description?: string | null;
      assignedUserId?: string | null;
      assignedGroupId?: string | null;
      priority?: IncidentSeverity;
      dueAt?: Date | null;
    },
    meta: RequestMeta = {},
  ) {
    await this.requireIncident(id);
    if (!input.title?.trim()) throw new ValidationError('عنوان المهمة مطلوب');

    const task = await prisma.incidentTask.create({
      data: {
        incidentId: id,
        title: input.title.trim(),
        description: input.description ?? null,
        assignedUserId: input.assignedUserId ?? null,
        assignedGroupId: input.assignedGroupId ?? null,
        priority: input.priority ?? IncidentSeverity.MEDIUM,
        status: input.assignedUserId ? IncidentTaskStatus.ASSIGNED : IncidentTaskStatus.PENDING,
        dueAt: input.dueAt ?? null,
        createdById: actor.id,
      },
    });

    await this.audit(actor, id, { taskId: task.id }, meta);
    broadcast('incident:task-created', { incidentId: id, taskId: task.id });
    return task;
  }

  async completeTask(
    actor: AuthenticatedUser,
    id: string,
    taskId: string,
    input: { completionNotes?: string | null } = {},
    meta: RequestMeta = {},
  ) {
    await this.requireIncident(id);
    const task = await prisma.incidentTask.findFirst({
      where: { id: taskId, incidentId: id, deletedAt: null },
    });
    if (!task) throw new NotFoundError('المهمة غير موجودة');

    const updated = await prisma.incidentTask.update({
      where: { id: taskId },
      data: {
        status: IncidentTaskStatus.COMPLETED,
        completedAt: new Date(),
        completedById: actor.id,
        completionNotes: input.completionNotes ?? null,
      },
    });

    await this.audit(actor, id, { taskId, completed: true }, meta);
    broadcast('incident:task-completed', { incidentId: id, taskId });
    return updated;
  }

  async addFollowUp(
    actor: AuthenticatedUser,
    id: string,
    input: {
      title: string;
      description: string;
      assignedToId?: string | null;
      dueAt: Date;
    },
    meta: RequestMeta = {},
  ) {
    const existing = await this.requireIncident(id);
    if (!input.title?.trim() || !input.description?.trim()) {
      throw new ValidationError('عنوان ووصف المتابعة مطلوبان');
    }
    if (!input.dueAt) throw new ValidationError('موعد المتابعة مطلوب');

    const followUp = await prisma.incidentFollowUp.create({
      data: {
        incidentId: id,
        title: input.title.trim(),
        description: input.description.trim(),
        assignedToId: input.assignedToId ?? null,
        dueAt: input.dueAt,
        createdById: actor.id,
        status: IncidentFollowUpStatus.OPEN,
      },
    });

    await prisma.incident.update({
      where: { id },
      data: { requiresFollowUp: true, followUpDueAt: input.dueAt },
    });

    await this.history(
      id,
      IncidentHistoryAction.FOLLOW_UP_CREATED,
      actor.id,
      existing.status,
      existing.status,
      input.title,
    );
    await this.audit(actor, id, { followUpId: followUp.id }, meta);
    broadcast('incident:follow-up-created', { incidentId: id, followUpId: followUp.id });
    return followUp;
  }

  async completeFollowUp(
    actor: AuthenticatedUser,
    id: string,
    followUpId: string,
    input: { result?: string | null } = {},
    meta: RequestMeta = {},
  ) {
    await this.requireIncident(id);
    const row = await prisma.incidentFollowUp.findFirst({
      where: { id: followUpId, incidentId: id, deletedAt: null },
    });
    if (!row) throw new NotFoundError('المتابعة غير موجودة');

    const updated = await prisma.incidentFollowUp.update({
      where: { id: followUpId },
      data: {
        status: IncidentFollowUpStatus.COMPLETED,
        completedAt: new Date(),
        result: input.result ?? null,
      },
    });

    await this.audit(actor, id, { followUpId, completed: true }, meta);
    return updated;
  }

  async fromReferral(
    actor: AuthenticatedUser,
    referralId: string,
    input: { force?: boolean } = {},
    meta: RequestMeta = {},
  ) {
    const referral = await prisma.securityReferral.findFirst({
      where: { id: referralId, deletedAt: null },
      include: { attachments: { where: { deletedAt: null } } },
    });
    if (!referral) throw new NotFoundError('الإحالة الأمنية غير موجودة');

    const existing = await prisma.incident.findFirst({
      where: { relatedReferralId: referralId, deletedAt: null },
    });
    if (existing && !input.force) {
      throw new ConflictError('يوجد بلاغ مرتبط بهذه الإحالة مسبقاً — استخدم force=true لإعادة الإنشاء');
    }

    const type =
      (await prisma.incidentType.findFirst({
        where: { code: referral.referralType, deletedAt: null, isActive: true },
      })) ??
      (await prisma.incidentType.findFirst({
        where: { code: 'SECURITY_REPORT', deletedAt: null, isActive: true },
      }));
    if (!type) throw new ValidationError('نوع البلاغ غير متوفر — نفّذ البذر أولاً');

    const incidentNumber = await nextIncidentNumber();
    const severity = referral.severity as unknown as IncidentSeverity;
    const occurredAt = referral.occurredAt;
    const slaDueAt = new Date(
      occurredAt.getTime() + SLA_HOURS_BY_SEVERITY[severity] * 60 * 60 * 1000,
    );
    const reportedAt = new Date();

    const created = await prisma.incident.create({
      data: {
        incidentNumber,
        typeId: type.id,
        title: referral.title,
        description: referral.description,
        severity,
        status: IncidentStatus.REPORTED,
        source: IncidentSource.CCTV_REFERRAL,
        zoneId: referral.zoneId,
        checkpointId: referral.checkpointId,
        floorNumber: referral.floorNumber,
        reporterId: actor.id,
        assigneeId: referral.assignedUserId,
        assignedGroupId: referral.assignedGroupId,
        assignedById: referral.assignedById,
        assignedAt: referral.assignedAt,
        occurredAt,
        reportedAt,
        slaDueAt,
        relatedReferralId: referralId,
        notes: referral.notes,
        attachments: {
          create: referral.attachments.map((a) => ({
            fileName: a.fileName,
            originalFileName: a.originalFileName,
            mimeType: a.mimeType,
            fileSize: a.fileSize,
            storageKey: `ref:${a.id}`,
            storagePath: a.storagePath,
            thumbnailPath: a.thumbnailPath,
            description: a.description,
            type: mapReferralAttachmentType(a.attachmentType),
            uploadedById: a.uploadedById,
          })),
        },
      },
    });

    await this.history(created.id, IncidentHistoryAction.CREATED, actor.id, null, IncidentStatus.REPORTED, null, {
      fromReferralId: referralId,
    });
    await this.history(created.id, IncidentHistoryAction.REPORTED, actor.id, null, IncidentStatus.REPORTED);
    await this.audit(actor, created.id, { fromReferralId: referralId, incidentNumber }, meta, AuditAction.CREATE);

    broadcast('incident:created', { incidentId: created.id, incidentNumber });
    refreshOps('incident:created', created.id);
    return this.getDetailed(created.id);
  }

  async fromFieldAlert(
    actor: AuthenticatedUser,
    alertId: string,
    input: { force?: boolean } = {},
    meta: RequestMeta = {},
  ) {
    const alert = await prisma.fieldAlert.findFirst({ where: { id: alertId } });
    if (!alert) throw new NotFoundError('تنبيه الميدان غير موجود');

    if (alert.incidentId && !input.force) {
      const linked = await prisma.incident.findFirst({
        where: { id: alert.incidentId, deletedAt: null },
      });
      if (linked) {
        throw new ConflictError('التنبيه مرتبط ببلاغ مسبقاً — استخدم force=true');
      }
    }

    const typeCode =
      alert.alertType === 'SOS'
        ? 'SUPPORT_REQUEST'
        : alert.alertType === 'RESTRICTED_AREA'
          ? 'UNAUTHORIZED_ACCESS'
          : alert.alertType === 'SECURITY_NOTICE'
            ? 'SECURITY'
            : 'SECURITY_REPORT';
    const type =
      (await prisma.incidentType.findFirst({
        where: { code: typeCode, deletedAt: null, isActive: true },
      })) ??
      (await prisma.incidentType.findFirst({
        where: { code: 'OTHER', deletedAt: null, isActive: true },
      }));
    if (!type) throw new ValidationError('نوع البلاغ غير متوفر');

    const incidentNumber = await nextIncidentNumber();
    const severity = alert.severity as unknown as IncidentSeverity;
    const occurredAt = alert.createdAt;
    const slaDueAt = new Date(
      occurredAt.getTime() + SLA_HOURS_BY_SEVERITY[severity] * 60 * 60 * 1000,
    );

    const created = await prisma.incident.create({
      data: {
        incidentNumber,
        typeId: type.id,
        title: alert.title,
        description: alert.description,
        severity,
        status: IncidentStatus.REPORTED,
        source: alert.alertType === 'SOS' ? IncidentSource.SOS : IncidentSource.FIELD_ALERT,
        zoneId: alert.zoneId,
        mapX: alert.mapX,
        mapY: alert.mapY,
        patrolSessionId: alert.patrolSessionId,
        reporterId: actor.id,
        assigneeId: alert.assignedUserId,
        assignedGroupId: alert.assignedGroupId,
        occurredAt,
        reportedAt: new Date(),
        slaDueAt,
      },
    });

    await prisma.fieldAlert.update({
      where: { id: alertId },
      data: { incidentId: created.id },
    });

    await this.history(created.id, IncidentHistoryAction.CREATED, actor.id, null, IncidentStatus.REPORTED, null, {
      fromFieldAlertId: alertId,
    });
    await this.history(created.id, IncidentHistoryAction.REPORTED, actor.id, null, IncidentStatus.REPORTED);
    await this.audit(actor, created.id, { fromFieldAlertId: alertId, incidentNumber }, meta, AuditAction.CREATE);

    broadcast('incident:created', { incidentId: created.id, incidentNumber });
    refreshOps('incident:created', created.id);
    return this.getDetailed(created.id);
  }

  async fromViolation(
    actor: AuthenticatedUser,
    violationId: string,
    input: { force?: boolean } = {},
    meta: RequestMeta = {},
  ) {
    const violation = await prisma.vehicleViolation.findFirst({
      where: { id: violationId, deletedAt: null },
    });
    if (!violation) throw new NotFoundError('المخالفة غير موجودة');

    const existing = await prisma.incident.findFirst({
      where: { relatedViolationId: violationId, deletedAt: null },
    });
    if (existing && !input.force) {
      throw new ConflictError('يوجد بلاغ مرتبط بهذه المخالفة مسبقاً');
    }

    const type =
      (await prisma.incidentType.findFirst({
        where: { code: 'PARKING', deletedAt: null, isActive: true },
      })) ??
      (await prisma.incidentType.findFirst({
        where: { code: 'SECURITY_REPORT', deletedAt: null, isActive: true },
      }));
    if (!type) throw new ValidationError('نوع البلاغ غير متوفر');

    const incidentNumber = await nextIncidentNumber();
    const occurredAt = violation.detectedAt;
    const severity = IncidentSeverity.MEDIUM;
    const slaDueAt = new Date(
      occurredAt.getTime() + SLA_HOURS_BY_SEVERITY[severity] * 60 * 60 * 1000,
    );

    const created = await prisma.incident.create({
      data: {
        incidentNumber,
        typeId: type.id,
        title: `مخالفة مركبة ${violation.plateNumber}`,
        description: violation.notes?.trim() || `مخالفة ${violation.violationType} — لوحة ${violation.plateNumber}`,
        severity,
        status: IncidentStatus.REPORTED,
        source: IncidentSource.VEHICLE_VIOLATION,
        parkingCode: violation.parkingCode,
        locationId: violation.locationId,
        zoneId: violation.zoneId,
        checkpointId: violation.checkpointId,
        mapX: violation.mapX,
        mapY: violation.mapY,
        gpsLatitude: violation.gpsLatitude,
        gpsLongitude: violation.gpsLongitude,
        reporterId: actor.id,
        occurredAt,
        reportedAt: new Date(),
        slaDueAt,
        relatedViolationId: violationId,
      },
    });

    await this.history(created.id, IncidentHistoryAction.CREATED, actor.id, null, IncidentStatus.REPORTED, null, {
      fromViolationId: violationId,
    });
    await this.history(created.id, IncidentHistoryAction.REPORTED, actor.id, null, IncidentStatus.REPORTED);
    await this.audit(actor, created.id, { fromViolationId: violationId, incidentNumber }, meta, AuditAction.CREATE);

    broadcast('incident:created', { incidentId: created.id, incidentNumber });
    refreshOps('incident:created', created.id);
    return this.getDetailed(created.id);
  }

  async uploadAttachment(
    actor: AuthenticatedUser,
    id: string,
    input: {
      originalFileName: string;
      mimeType: string;
      contentBase64: string;
      description?: string | null;
      type?: AttachmentType;
    },
    meta: RequestMeta = {},
  ) {
    const existing = await this.requireIncident(id);
    assertNotTerminal(existing.status, 'إرفاق ملفات');

    const saved = await saveIncidentFile({
      incidentId: id,
      originalFileName: input.originalFileName,
      mimeType: input.mimeType,
      contentBase64: input.contentBase64,
    });

    const row = await prisma.incidentAttachment.create({
      data: {
        incidentId: id,
        fileName: saved.fileName,
        originalFileName: saved.originalFileName,
        mimeType: saved.mimeType,
        fileSize: saved.fileSize,
        storageKey: saved.storageKey,
        storagePath: saved.storagePath,
        description: input.description ?? null,
        type: input.type ?? AttachmentType.DOCUMENT,
        uploadedById: actor.id,
      },
    });

    await this.history(id, IncidentHistoryAction.ATTACHMENT_ADDED, actor.id, existing.status, existing.status, null, {
      attachmentId: row.id,
    });
    await this.audit(actor, id, { attachmentId: row.id }, meta);
    broadcast('incident:attachment-added', { incidentId: id, attachmentId: row.id });
    return row;
  }

  async getAttachmentFile(id: string, attachmentId: string) {
    await this.requireIncident(id);
    const attachment = await prisma.incidentAttachment.findFirst({
      where: { id: attachmentId, incidentId: id, deletedAt: null },
    });
    if (!attachment) throw new NotFoundError('المرفق غير موجود');

    const storagePath = attachment.storagePath ?? attachment.storageKey;
    if (storagePath.startsWith('ref:')) {
      const refAttachmentId = storagePath.slice(4);
      const refAtt = await prisma.securityReferralAttachment.findFirst({
        where: { id: refAttachmentId, deletedAt: null },
      });
      if (!refAtt) throw new NotFoundError('مرجع المرفق غير موجود');
      const { readCctvOperationFile } = await import(
        '../../cctv-operations/application/CctvOperationsStorage.js'
      );
      const buffer = await readCctvOperationFile(refAtt.storagePath);
      return {
        buffer,
        mimeType: refAtt.mimeType,
        fileName: refAtt.originalFileName || refAtt.fileName,
      };
    }

    const buffer = await readIncidentFile(storagePath);
    return {
      buffer,
      mimeType: attachment.mimeType,
      fileName: attachment.originalFileName || attachment.fileName,
    };
  }

  async nearestPersonnel(id: string) {
    return fieldOperationsService.getNearestPersonnel(id);
  }

  async nearbyPatrols(id: string) {
    await this.requireIncident(id);
    return operationsRoomService.nearbyPatrols(id);
  }

  // ─── Emergency procedures CRUD ───

  async listProcedures(activeOnly = true) {
    return prisma.emergencyProcedure.findMany({
      where: {
        deletedAt: null,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { code: 'asc' },
    });
  }

  async getProcedure(id: string) {
    const row = await prisma.emergencyProcedure.findFirst({
      where: { id, deletedAt: null },
    });
    if (!row) throw new NotFoundError('إجراء الطوارئ غير موجود');
    return row;
  }

  async createProcedure(
    actor: AuthenticatedUser,
    input: {
      name: string;
      code: string;
      incidentTypeCode: string;
      severity?: IncidentSeverity | null;
      description: string;
      instructionsJson: Prisma.InputJsonValue;
      isActive?: boolean;
    },
    meta: RequestMeta = {},
  ) {
    const code = input.code.trim().toUpperCase();
    const existing = await prisma.emergencyProcedure.findFirst({ where: { code } });
    if (existing && !existing.deletedAt) {
      throw new ConflictError('رمز إجراء الطوارئ موجود مسبقاً');
    }

    const row = await prisma.emergencyProcedure.create({
      data: {
        name: input.name.trim(),
        code,
        incidentTypeCode: input.incidentTypeCode.trim().toUpperCase(),
        severity: input.severity ?? null,
        description: input.description.trim(),
        instructionsJson: input.instructionsJson,
        isActive: input.isActive ?? true,
        createdById: actor.id,
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.CREATE,
      entityType: 'EmergencyProcedure',
      entityId: row.id,
      metadata: { code },
      meta,
    });
    return row;
  }

  async updateProcedure(
    actor: AuthenticatedUser,
    id: string,
    input: {
      name?: string;
      incidentTypeCode?: string;
      severity?: IncidentSeverity | null;
      description?: string;
      instructionsJson?: Prisma.InputJsonValue;
      isActive?: boolean;
    },
    meta: RequestMeta = {},
  ) {
    const existing = await prisma.emergencyProcedure.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('إجراء الطوارئ غير موجود');

    const row = await prisma.emergencyProcedure.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.incidentTypeCode !== undefined
          ? { incidentTypeCode: input.incidentTypeCode.trim().toUpperCase() }
          : {}),
        ...(input.severity !== undefined ? { severity: input.severity } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() } : {}),
        ...(input.instructionsJson !== undefined
          ? { instructionsJson: input.instructionsJson, version: { increment: 1 } }
          : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'EmergencyProcedure',
      entityId: id,
      metadata: { changedFields: Object.keys(input) },
      meta,
    });
    return row;
  }

  async softDeleteProcedure(actor: AuthenticatedUser, id: string, meta: RequestMeta = {}) {
    const existing = await prisma.emergencyProcedure.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundError('إجراء الطوارئ غير موجود');

    await prisma.emergencyProcedure.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await auditService.log({
      actorId: actor.id,
      action: AuditAction.DELETE,
      entityType: 'EmergencyProcedure',
      entityId: id,
      meta,
    });
  }

  async applyProcedureToIncident(
    actor: AuthenticatedUser,
    incidentId: string,
    procedureId: string,
    meta: RequestMeta = {},
  ) {
    await this.requireIncident(incidentId);
    const procedure = await prisma.emergencyProcedure.findFirst({
      where: { id: procedureId, deletedAt: null, isActive: true },
    });
    if (!procedure) throw new NotFoundError('إجراء الطوارئ غير موجود');

    const instructions = procedure.instructionsJson;
    const steps = Array.isArray(instructions)
      ? instructions
      : Array.isArray((instructions as { steps?: unknown })?.steps)
        ? ((instructions as { steps: unknown[] }).steps)
        : [];

    const created = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i] as { title?: string; stepTitle?: string };
      const stepTitle = String(step?.title ?? step?.stepTitle ?? `خطوة ${i + 1}`);
      const row = await prisma.incidentProcedureStep.upsert({
        where: {
          incidentId_procedureId_stepIndex: {
            incidentId,
            procedureId,
            stepIndex: i,
          },
        },
        create: {
          incidentId,
          procedureId,
          stepIndex: i,
          stepTitle,
        },
        update: { stepTitle },
      });
      created.push(row);
    }

    await this.audit(actor, incidentId, { procedureId, steps: created.length }, meta);
    return created;
  }

  async completeProcedureStep(
    actor: AuthenticatedUser,
    incidentId: string,
    stepId: string,
    input: { notes?: string | null } = {},
  ) {
    await this.requireIncident(incidentId);
    const step = await prisma.incidentProcedureStep.findFirst({
      where: { id: stepId, incidentId },
    });
    if (!step) throw new NotFoundError('خطوة الإجراء غير موجودة');

    return prisma.incidentProcedureStep.update({
      where: { id: stepId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
        completedById: actor.id,
        notes: input.notes ?? step.notes,
      },
    });
  }

  // ─── helpers ───

  private async transitionSimple(
    actor: AuthenticatedUser,
    id: string,
    next: IncidentStatus,
    action: IncidentHistoryAction,
    extra: Prisma.IncidentUpdateInput,
    event: string,
    meta: RequestMeta,
  ) {
    const existing = await this.requireIncident(id);
    assertNotTerminal(existing.status, 'تحديث الحالة');
    assertIncidentTransition(existing.status, next);

    const updated = await prisma.incident.update({
      where: { id },
      data: { status: next, ...extra },
    });

    await this.history(id, action, actor.id, existing.status, next);
    await this.audit(actor, id, { status: next }, meta);
    broadcast(event, { incidentId: id });
    refreshOps(event, id);
    return withAssignedAlias(updated);
  }

  private async requireIncident(id: string) {
    const incident = await prisma.incident.findFirst({ where: { id, deletedAt: null } });
    if (!incident) throw new NotFoundError('البلاغ غير موجود');
    return incident;
  }

  private async history(
    incidentId: string,
    action: IncidentHistoryAction,
    actorId: string,
    fromStatus: IncidentStatus | null,
    toStatus: IncidentStatus | null,
    notes?: string | null,
    metadata?: Prisma.InputJsonValue,
  ) {
    await prisma.incidentHistory.create({
      data: {
        incidentId,
        action,
        actorId,
        fromStatus: fromStatus ?? undefined,
        toStatus: toStatus ?? undefined,
        notes: notes ?? null,
        metadata: metadata ?? undefined,
      },
    });
  }

  private async audit(
    actor: AuthenticatedUser,
    entityId: string,
    metadata: Record<string, unknown>,
    meta: RequestMeta,
    action: AuditAction = AuditAction.UPDATE,
  ) {
    await auditService.log({
      actorId: actor.id,
      action,
      entityType: 'Incident',
      entityId,
      metadata: metadata as Prisma.InputJsonValue,
      meta,
    });
  }

  private canViewNote(
    actor: AuthenticatedUser,
    visibility: IncidentNoteVisibility,
    noteType: IncidentNoteType,
  ): boolean {
    if (noteType === IncidentNoteType.CONFIDENTIAL) {
      return (
        actor.roleCode === RoleCodes.SECURITY_DIRECTOR ||
        actor.roleCode === RoleCodes.OPERATIONS_MANAGER
      );
    }
    switch (visibility) {
      case IncidentNoteVisibility.ALL_AUTHORIZED:
        return true;
      case IncidentNoteVisibility.OPERATIONS_ONLY:
        return [
          RoleCodes.OPERATIONS_MANAGER,
          RoleCodes.SECURITY_DIRECTOR,
          RoleCodes.SECURITY_SUPERVISOR,
        ].includes(actor.roleCode as never);
      case IncidentNoteVisibility.SUPERVISORS_ONLY:
        return [
          RoleCodes.SECURITY_SUPERVISOR,
          RoleCodes.OPERATIONS_MANAGER,
          RoleCodes.SECURITY_DIRECTOR,
        ].includes(actor.roleCode as never);
      case IncidentNoteVisibility.DIRECTORS_ONLY:
        return actor.roleCode === RoleCodes.SECURITY_DIRECTOR;
      default:
        return true;
    }
  }
}

function mapReferralAttachmentType(t: string): AttachmentType {
  switch (t) {
    case 'IMAGE':
      return AttachmentType.IMAGE;
    case 'SCREENSHOT':
      return AttachmentType.SCREENSHOT;
    case 'VIDEO_SHORT':
      return AttachmentType.VIDEO_SHORT;
    case 'DOCUMENT':
      return AttachmentType.DOCUMENT;
    default:
      return AttachmentType.OTHER;
  }
}

export { mapRoleToIncidentSource };
export const incidentOpsService = new IncidentOpsService();
