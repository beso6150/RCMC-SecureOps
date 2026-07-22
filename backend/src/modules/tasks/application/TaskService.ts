import {
  NotificationCategory,
  NotificationPriority,
  OperationalTaskType,
  TaskPriority,
  TaskStatus,
  TaskUpdateType,
} from '@prisma/client';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/index.js';
import {
  emitToRole,
  emitToUser,
} from '../../../shared/realtime/socketServer.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { AuthenticatedUser, RequestMeta } from '../../identity/domain/types.js';
import { notificationService } from '../../notifications/application/NotificationService.js';
import { CreateTaskData, TaskListFilters, UpdateTaskData } from '../domain/types.js';
import { taskRepository } from '../infrastructure/TaskRepository.js';
import { prisma } from '../../../shared/database/prisma.js';
import { nextTaskNumber } from './taskNumbering.js';
import {
  assertEvidenceRequired,
  assertRejectionReason,
  assertTaskTransition,
} from './taskTransitions.js';
import { saveTaskEvidenceFile } from './TaskEvidenceStorage.js';
import { taskInclude } from '../domain/types.js';

class TaskService {
  private canManageOthers(user: AuthenticatedUser): boolean {
    return (
      user.permissions.includes(PermissionCodes.TASKS_CREATE) ||
      user.permissions.includes(PermissionCodes.TASKS_ASSIGN)
    );
  }

  private assertCanUpdate(user: AuthenticatedUser, assigneeId: string): void {
    if (
      !user.permissions.includes(PermissionCodes.TASKS_UPDATE) &&
      !user.permissions.includes(PermissionCodes.TASKS_ACCEPT) &&
      !user.permissions.includes(PermissionCodes.TASKS_COMPLETE)
    ) {
      throw new ForbiddenError('Missing permission to update tasks');
    }
    if (!this.canManageOthers(user) && assigneeId !== user.id) {
      throw new ForbiddenError('يمكنك تحديث المهام المسندة إليك فقط');
    }
  }

  private emitTaskEvents(
    task: { id: string; assigneeId: string; assignerId?: string | null },
    payload: unknown,
  ): void {
    emitToUser(task.assigneeId, 'task:updated', payload);
    emitToUser(task.assigneeId, 'dashboard:refresh', { reason: 'task:updated' });
    emitToUser(task.assigneeId, 'tasks:dashboard-refresh', { reason: 'task:updated', taskId: task.id });
    if (task.assignerId && task.assignerId !== task.assigneeId) {
      emitToUser(task.assignerId, 'task:updated', payload);
      emitToUser(task.assignerId, 'dashboard:refresh', { reason: 'task:updated' });
      emitToUser(task.assignerId, 'tasks:dashboard-refresh', {
        reason: 'task:updated',
        taskId: task.id,
      });
    }
  }

  private async addUpdate(input: {
    taskId: string;
    userId: string;
    updateType: TaskUpdateType;
    oldStatus?: TaskStatus | null;
    newStatus?: TaskStatus | null;
    message?: string | null;
  }) {
    return prisma.taskUpdate.create({
      data: {
        taskId: input.taskId,
        userId: input.userId,
        updateType: input.updateType,
        oldStatus: input.oldStatus ?? null,
        newStatus: input.newStatus ?? null,
        message: input.message ?? null,
      },
    });
  }

  async list(user: AuthenticatedUser, filters: TaskListFilters) {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);

    const scopedAssigneeId =
      filters.mine || !this.canManageOthers(user) ? user.id : undefined;

    const { rows, total } = await taskRepository.list(
      {
        ...filters,
        ...(filters.mine ? { assigneeId: user.id } : {}),
      },
      scopedAssigneeId,
    );

    return {
      data: rows,
      meta: { page, pageSize, total },
    };
  }

  async listMine(user: AuthenticatedUser, filters: TaskListFilters = {}) {
    return this.list(user, { ...filters, mine: true });
  }

  async listOverdue(user: AuthenticatedUser, filters: TaskListFilters = {}) {
    return this.list(user, { ...filters, overdue: true });
  }

  async statistics(user: AuthenticatedUser) {
    const viewAll = this.canManageOthers(user);
    const scopeWhere = {
      deletedAt: null as null,
      ...(viewAll ? {} : { assigneeId: user.id }),
    };
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const [byStatus, byPriority, byType, overdue, completedToday] = await Promise.all([
      prisma.task.groupBy({
        by: ['status'],
        where: scopeWhere,
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ['priority'],
        where: scopeWhere,
        _count: { _all: true },
      }),
      prisma.task.groupBy({
        by: ['taskType'],
        where: scopeWhere,
        _count: { _all: true },
      }),
      prisma.task.count({
        where: {
          ...scopeWhere,
          dueAt: { lt: now },
          status: {
            notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.REJECTED],
          },
        },
      }),
      prisma.task.count({
        where: {
          ...scopeWhere,
          status: TaskStatus.COMPLETED,
          completedAt: { gte: startOfDay },
        },
      }),
    ]);

    return {
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      byPriority: byPriority.map((r) => ({ priority: r.priority, count: r._count._all })),
      byType: byType.map((r) => ({ taskType: r.taskType, count: r._count._all })),
      overdue,
      completedToday,
      scope: viewAll ? 'all' : 'mine',
    };
  }

  async assign(
    user: AuthenticatedUser,
    id: string,
    input: { assigneeId?: string; assignedGroupId?: string | null },
    _meta: RequestMeta = {},
  ) {
    if (!user.permissions.includes(PermissionCodes.TASKS_ASSIGN)) {
      throw new ForbiddenError('Missing permission to assign tasks');
    }

    const existing = await taskRepository.findById(id);
    if (!existing) throw new NotFoundError('المهمة غير موجودة');

    if (!input.assigneeId && input.assignedGroupId === undefined) {
      throw new ValidationError('يجب تحديد المسند إليه أو المجموعة');
    }

    const nextAssigneeId = input.assigneeId ?? existing.assigneeId;
    const task = await prisma.task.update({
      where: { id },
      data: {
        assigneeId: nextAssigneeId,
        ...(input.assignedGroupId !== undefined
          ? { assignedGroupId: input.assignedGroupId }
          : {}),
        assignedAt: new Date(),
        assignerId: user.id,
        status:
          existing.status === TaskStatus.NEW || existing.status === TaskStatus.PENDING
            ? TaskStatus.ASSIGNED
            : existing.status,
      },
      include: taskInclude,
    });

    await this.addUpdate({
      taskId: id,
      userId: user.id,
      updateType: TaskUpdateType.ASSIGNED,
      oldStatus: existing.status,
      newStatus: task.status,
      message: 'تم تعيين المهمة',
    });

    if (nextAssigneeId !== user.id) {
      await notificationService.create({
        userId: nextAssigneeId,
        senderId: user.id,
        title: 'مهمة مسندة',
        body: `تم تعيين مهمة: ${task.title}`,
        priority: NotificationPriority.NORMAL,
        category: NotificationCategory.TASK,
        entityType: 'Task',
        entityId: task.id,
        deduplicationKey: `task:assign:${task.id}:${nextAssigneeId}`,
      });
    }

    this.emitTaskEvents(task, task);
    return task;
  }

  async reassign(
    user: AuthenticatedUser,
    id: string,
    input: {
      assigneeId?: string;
      assignedGroupId?: string | null;
      reason?: string | null;
    },
    _meta: RequestMeta = {},
  ) {
    if (!user.permissions.includes(PermissionCodes.TASKS_ASSIGN)) {
      throw new ForbiddenError('Missing permission to reassign tasks');
    }

    const existing = await taskRepository.findById(id);
    if (!existing) throw new NotFoundError('المهمة غير موجودة');

    if (!input.assigneeId && input.assignedGroupId === undefined) {
      throw new ValidationError('يجب تحديد المسند إليه أو المجموعة');
    }

    const nextAssigneeId = input.assigneeId ?? existing.assigneeId;
    const reason = input.reason?.trim() || null;

    const task = await prisma.task.update({
      where: { id },
      data: {
        assigneeId: nextAssigneeId,
        ...(input.assignedGroupId !== undefined
          ? { assignedGroupId: input.assignedGroupId }
          : {}),
        assignedAt: new Date(),
        assignerId: user.id,
        acceptedAt: null,
        startedAt: null,
        status: TaskStatus.ASSIGNED,
      },
      include: taskInclude,
    });

    await this.addUpdate({
      taskId: id,
      userId: user.id,
      updateType: TaskUpdateType.REASSIGNED,
      oldStatus: existing.status,
      newStatus: TaskStatus.ASSIGNED,
      message: reason || 'تم إعادة تعيين المهمة',
    });

    if (nextAssigneeId !== user.id) {
      await notificationService.create({
        userId: nextAssigneeId,
        senderId: user.id,
        title: 'إعادة تعيين مهمة',
        body: reason
          ? `أُعيد تعيين المهمة «${task.title}»: ${reason}`
          : `أُعيد تعيين المهمة: ${task.title}`,
        priority: NotificationPriority.HIGH,
        category: NotificationCategory.TASK,
        entityType: 'Task',
        entityId: task.id,
        deduplicationKey: `task:reassign:${task.id}:${nextAssigneeId}:${Date.now()}`,
      });
    }

    if (existing.assigneeId !== nextAssigneeId && existing.assigneeId !== user.id) {
      emitToUser(existing.assigneeId, 'tasks:dashboard-refresh', {
        reason: 'task:reassigned',
        taskId: id,
      });
    }

    this.emitTaskEvents(task, task);
    return task;
  }

  async getById(user: AuthenticatedUser, id: string) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError('المهمة غير موجودة');
    if (!this.canManageOthers(user) && task.assigneeId !== user.id) {
      throw new ForbiddenError('يمكنك عرض المهام المسندة إليك فقط');
    }
    return task;
  }

  async timeline(user: AuthenticatedUser, id: string) {
    await this.getById(user, id);
    return prisma.taskUpdate.findMany({
      where: { taskId: id },
      include: {
        user: { select: { id: true, fullName: true, employeeNumber: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(user: AuthenticatedUser, input: CreateTaskData, _meta: RequestMeta = {}) {
    if (!user.permissions.includes(PermissionCodes.TASKS_CREATE)) {
      throw new ForbiddenError('Missing permission to create tasks');
    }

    if (!input.title.trim()) {
      throw new ValidationError('عنوان المهمة مطلوب');
    }

    const taskNumber = await nextTaskNumber();
    const status = input.status ?? TaskStatus.ASSIGNED;

    const task = await prisma.task.create({
      data: {
        taskNumber,
        title: input.title.trim(),
        description: input.description,
        status,
        priority: input.priority ?? TaskPriority.NORMAL,
        taskType: (input.taskType as OperationalTaskType | undefined) ?? OperationalTaskType.GENERAL,
        assigneeId: input.assigneeId,
        assignerId: user.id,
        assignedGroupId: input.assignedGroupId ?? null,
        assignedAt: new Date(),
        dueAt: input.dueAt ?? null,
        requiresEvidence: input.requiresEvidence ?? false,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        sourceType: input.sourceType ?? null,
        sourceId: input.sourceId ?? null,
        createdById: user.id,
      },
      include: taskInclude,
    });

    await this.addUpdate({
      taskId: task.id,
      userId: user.id,
      updateType: TaskUpdateType.CREATED,
      newStatus: status,
      message: 'تم إنشاء المهمة',
    });

    if (input.notifyAssignee !== false && task.assigneeId !== user.id) {
      await notificationService.create({
        userId: task.assigneeId,
        senderId: user.id,
        title: 'مهمة جديدة',
        body: `تم تعيين مهمة جديدة: ${task.title}`,
        priority: NotificationPriority.NORMAL,
        category: NotificationCategory.TASK,
        entityType: 'Task',
        entityId: task.id,
        actionUrl: `/tasks/${task.id}`,
        deduplicationKey: `task:assign:${task.id}`,
      });
    }

    this.emitTaskEvents(task, task);
    return task;
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    input: UpdateTaskData,
    _meta: RequestMeta = {},
  ) {
    const existing = await taskRepository.findById(id);
    if (!existing) throw new NotFoundError('المهمة غير موجودة');

    this.assertCanUpdate(user, existing.assigneeId);

    if (input.assigneeId && !user.permissions.includes(PermissionCodes.TASKS_ASSIGN)) {
      throw new ForbiddenError('Missing permission to reassign tasks');
    }

    if (input.status && input.status !== existing.status) {
      assertTaskTransition(existing.status, input.status);
    }

    if (
      input.status === TaskStatus.CANCELLED &&
      !this.canManageOthers(user) &&
      existing.assigneeId === user.id
    ) {
      throw new ForbiddenError('لا يمكنك إلغاء المهمة المسندة إليك بهذه الطريقة');
    }

    const task = await taskRepository.update(id, input);

    if (input.status && input.status !== existing.status) {
      await this.addUpdate({
        taskId: id,
        userId: user.id,
        updateType: TaskUpdateType.NOTE_ADDED,
        oldStatus: existing.status,
        newStatus: input.status,
      });
    }

    this.emitTaskEvents(task, task);
    return task;
  }

  private async transition(
    user: AuthenticatedUser,
    id: string,
    to: TaskStatus,
    updateType: TaskUpdateType,
    extra: Record<string, unknown> = {},
    message?: string,
  ) {
    const existing = await taskRepository.findById(id);
    if (!existing) throw new NotFoundError('المهمة غير موجودة');
    this.assertCanUpdate(user, existing.assigneeId);
    assertTaskTransition(existing.status, to);

    const task = await prisma.task.update({
      where: { id },
      data: {
        status: to,
        ...extra,
      },
      include: taskInclude,
    });

    await this.addUpdate({
      taskId: id,
      userId: user.id,
      updateType,
      oldStatus: existing.status,
      newStatus: to,
      message,
    });

    this.emitTaskEvents(task, task);
    return task;
  }

  async accept(user: AuthenticatedUser, id: string, _meta: RequestMeta = {}) {
    return this.transition(user, id, TaskStatus.ACCEPTED, TaskUpdateType.ACCEPTED, {
      acceptedAt: new Date(),
    }, 'تم قبول المهمة');
  }

  async start(user: AuthenticatedUser, id: string, _meta: RequestMeta = {}) {
    return this.transition(user, id, TaskStatus.IN_PROGRESS, TaskUpdateType.STARTED, {
      startedAt: new Date(),
    }, 'تم بدء المهمة');
  }

  async wait(
    user: AuthenticatedUser,
    id: string,
    note?: string,
    _meta: RequestMeta = {},
  ) {
    return this.transition(
      user,
      id,
      TaskStatus.WAITING,
      TaskUpdateType.WAITING,
      {},
      note?.trim() || 'المهمة في انتظار',
    );
  }

  async complete(
    user: AuthenticatedUser,
    id: string,
    input: { completionNotes?: string | null } = {},
    _meta: RequestMeta = {},
  ) {
    const existing = await taskRepository.findById(id);
    if (!existing) throw new NotFoundError('المهمة غير موجودة');
    this.assertCanUpdate(user, existing.assigneeId);

    if (existing.status === TaskStatus.COMPLETED) {
      return existing;
    }

    assertTaskTransition(existing.status, TaskStatus.COMPLETED);

    const evidenceCount = await prisma.taskEvidence.count({
      where: { taskId: id, deletedAt: null },
    });
    assertEvidenceRequired(existing.requiresEvidence, evidenceCount);

    const task = await prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
        completedById: user.id,
        completionNotes: input.completionNotes?.trim() || null,
      },
      include: taskInclude,
    });

    await this.addUpdate({
      taskId: id,
      userId: user.id,
      updateType: TaskUpdateType.COMPLETED,
      oldStatus: existing.status,
      newStatus: TaskStatus.COMPLETED,
      message: input.completionNotes?.trim() || 'تم إكمال المهمة',
    });

    this.emitTaskEvents(task, task);
    return task;
  }

  async reject(
    user: AuthenticatedUser,
    id: string,
    reason: string,
    _meta: RequestMeta = {},
  ) {
    const rejectionReason = assertRejectionReason(reason);
    return this.transition(
      user,
      id,
      TaskStatus.REJECTED,
      TaskUpdateType.REJECTED,
      { rejectionReason },
      rejectionReason,
    );
  }

  async cancel(
    user: AuthenticatedUser,
    id: string,
    reason?: string,
    _meta: RequestMeta = {},
  ) {
    const existing = await taskRepository.findById(id);
    if (!existing) throw new NotFoundError('المهمة غير موجودة');

    if (
      !this.canManageOthers(user) &&
      !user.permissions.includes(PermissionCodes.TASKS_CANCEL)
    ) {
      throw new ForbiddenError('Missing permission to cancel tasks');
    }

    assertTaskTransition(existing.status, TaskStatus.CANCELLED);

    const task = await prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason?.trim() || null,
      },
      include: taskInclude,
    });

    await this.addUpdate({
      taskId: id,
      userId: user.id,
      updateType: TaskUpdateType.CANCELLED,
      oldStatus: existing.status,
      newStatus: TaskStatus.CANCELLED,
      message: reason?.trim() || 'تم إلغاء المهمة',
    });

    this.emitTaskEvents(task, task);
    return task;
  }

  async escalate(user: AuthenticatedUser, id: string, note?: string, _meta: RequestMeta = {}) {
    if (
      !user.permissions.includes(PermissionCodes.TASKS_ESCALATE) &&
      !this.canManageOthers(user)
    ) {
      throw new ForbiddenError('Missing permission to escalate tasks');
    }

    const existing = await this.getById(user, id);

    await this.addUpdate({
      taskId: id,
      userId: user.id,
      updateType: TaskUpdateType.NOTE_ADDED,
      oldStatus: existing.status,
      newStatus: existing.status,
      message: note?.trim() || 'تم تصعيد المهمة',
    });

    emitToRole('SECURITY_SUPERVISOR', 'task:escalated', {
      taskId: id,
      title: existing.title,
      note: note?.trim() || null,
    });
    emitToRole('OPERATIONS_MANAGER', 'task:escalated', {
      taskId: id,
      title: existing.title,
      note: note?.trim() || null,
    });

    if (existing.assignerId) {
      await notificationService.create({
        userId: existing.assignerId,
        senderId: user.id,
        title: 'تصعيد مهمة',
        body: `تم تصعيد المهمة: ${existing.title}`,
        priority: NotificationPriority.HIGH,
        category: NotificationCategory.TASK,
        entityType: 'Task',
        entityId: id,
        deduplicationKey: `task:escalate:${id}:${Date.now()}`,
      });
    }

    this.emitTaskEvents(existing, { ...existing, escalated: true });
    return existing;
  }

  async addEvidence(
    user: AuthenticatedUser,
    id: string,
    file: {
      originalFileName: string;
      mimeType: string;
      contentBase64: string;
      description?: string | null;
    },
    _meta: RequestMeta = {},
  ) {
    const existing = await this.getById(user, id);
    this.assertCanUpdate(user, existing.assigneeId);

    if (
      !user.permissions.includes(PermissionCodes.TASKS_EVIDENCE) &&
      !user.permissions.includes(PermissionCodes.TASKS_UPDATE)
    ) {
      throw new ForbiddenError('Missing permission to upload task evidence');
    }

    const saved = await saveTaskEvidenceFile({
      taskId: id,
      originalFileName: file.originalFileName,
      mimeType: file.mimeType,
      contentBase64: file.contentBase64,
    });

    const evidence = await prisma.taskEvidence.create({
      data: {
        taskId: id,
        fileName: saved.fileName,
        originalFileName: saved.originalFileName,
        mimeType: saved.mimeType,
        fileSize: saved.fileSize,
        storagePath: saved.storagePath,
        uploadedById: user.id,
        description: file.description?.trim() || null,
      },
    });

    await this.addUpdate({
      taskId: id,
      userId: user.id,
      updateType: TaskUpdateType.EVIDENCE_ADDED,
      message: 'تم إرفاق دليل',
    });

    this.emitTaskEvents(existing, { taskId: id, evidence });
    return evidence;
  }

  async softDelete(user: AuthenticatedUser, id: string, _meta: RequestMeta = {}) {
    const existing = await taskRepository.findById(id);
    if (!existing) throw new NotFoundError('المهمة غير موجودة');

    if (!this.canManageOthers(user)) {
      throw new ForbiddenError('Missing permission to delete tasks');
    }

    await taskRepository.softDelete(id);
    this.emitTaskEvents(existing, { id, deleted: true });
  }
}

export const taskService = new TaskService();
