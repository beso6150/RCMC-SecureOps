import { Prisma, TaskStatus } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import {
  CreateTaskData,
  TaskListFilters,
  TaskWithRelations,
  UpdateTaskData,
  taskInclude,
} from '../domain/types.js';

export class TaskRepository {
  async list(
    filters: TaskListFilters,
    scopedAssigneeId?: string,
  ): Promise<{ rows: TaskWithRelations[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;
    const now = new Date();

    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.taskType ? { taskType: filters.taskType } : {}),
      ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
      ...(scopedAssigneeId ? { assigneeId: scopedAssigneeId } : {}),
      ...(filters.overdue
        ? {
            dueAt: { lt: now },
            status: {
              notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.REJECTED],
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: taskInclude,
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.task.count({ where }),
    ]);

    return { rows, total };
  }

  async findById(id: string): Promise<TaskWithRelations | null> {
    return prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: taskInclude,
    });
  }

  async create(data: CreateTaskData): Promise<TaskWithRelations> {
    return prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        assigneeId: data.assigneeId,
        assignerId: data.assignerId ?? null,
        dueAt: data.dueAt ?? null,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        requiresEvidence: data.requiresEvidence ?? false,
      },
      include: taskInclude,
    });
  }

  async update(id: string, data: UpdateTaskData): Promise<TaskWithRelations> {
    return prisma.task.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.assigneeId !== undefined ? { assigneeId: data.assigneeId } : {}),
        ...(data.dueAt !== undefined ? { dueAt: data.dueAt } : {}),
        ...(data.entityType !== undefined ? { entityType: data.entityType } : {}),
        ...(data.entityId !== undefined ? { entityId: data.entityId } : {}),
        ...(data.requiresEvidence !== undefined
          ? { requiresEvidence: data.requiresEvidence }
          : {}),
      },
      include: taskInclude,
    });
  }

  async complete(id: string): Promise<TaskWithRelations> {
    return prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: taskInclude,
    });
  }

  async cancel(id: string): Promise<TaskWithRelations> {
    return prisma.task.update({
      where: { id },
      data: { status: TaskStatus.CANCELLED, cancelledAt: new Date() },
      include: taskInclude,
    });
  }

  async softDelete(id: string): Promise<void> {
    await prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async countPendingForUser(userId: string): Promise<number> {
    return prisma.task.count({
      where: {
        assigneeId: userId,
        deletedAt: null,
        status: {
          in: [
            TaskStatus.PENDING,
            TaskStatus.ASSIGNED,
            TaskStatus.ACCEPTED,
            TaskStatus.IN_PROGRESS,
            TaskStatus.WAITING,
            TaskStatus.NEW,
          ],
        },
      },
    });
  }

  async countOverdueForUser(userId: string): Promise<number> {
    const now = new Date();
    return prisma.task.count({
      where: {
        assigneeId: userId,
        deletedAt: null,
        dueAt: { lt: now },
        status: {
          notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.REJECTED],
        },
      },
    });
  }
}

export const taskRepository = new TaskRepository();
