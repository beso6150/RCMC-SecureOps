import { OperationalTaskType, Prisma, TaskPriority, TaskStatus } from '@prisma/client';

export const taskInclude = {
  assignee: {
    select: {
      id: true,
      fullName: true,
      employeeNumber: true,
    },
  },
  assigner: {
    select: {
      id: true,
      fullName: true,
      employeeNumber: true,
    },
  },
  evidences: {
    where: { deletedAt: null },
    select: {
      id: true,
      fileName: true,
      originalFileName: true,
      mimeType: true,
      fileSize: true,
      description: true,
      createdAt: true,
    },
  },
} satisfies Prisma.TaskInclude;

export type TaskWithRelations = Prisma.TaskGetPayload<{
  include: typeof taskInclude;
}>;

export interface TaskListFilters {
  page?: number;
  pageSize?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  mine?: boolean;
  overdue?: boolean;
  taskType?: OperationalTaskType;
}

export interface CreateTaskData {
  title: string;
  description: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  taskType?: OperationalTaskType | string;
  assigneeId: string;
  assignerId?: string | null;
  assignedGroupId?: string | null;
  dueAt?: Date | null;
  requiresEvidence?: boolean;
  entityType?: string | null;
  entityId?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  notifyAssignee?: boolean;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  dueAt?: Date | null;
  entityType?: string | null;
  entityId?: string | null;
  requiresEvidence?: boolean;
}
