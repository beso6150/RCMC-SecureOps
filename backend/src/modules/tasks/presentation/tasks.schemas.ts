import { OperationalTaskType, TaskPriority, TaskStatus } from '@prisma/client';
import { z } from 'zod';

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  taskType: z.nativeEnum(OperationalTaskType).optional(),
  assigneeId: z.string().uuid().optional(),
  mine: z
    .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  overdue: z
    .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
    .optional()
    .transform((v) => v === 'true' || v === '1'),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(10000),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  taskType: z.nativeEnum(OperationalTaskType).optional(),
  assigneeId: z.string().uuid(),
  assignedGroupId: z.string().uuid().nullable().optional(),
  dueAt: z.coerce.date().nullable().optional(),
  requiresEvidence: z.boolean().optional(),
  entityType: z.string().trim().max(100).nullable().optional(),
  entityId: z.string().uuid().nullable().optional(),
  sourceType: z.string().trim().max(100).nullable().optional(),
  sourceId: z.string().uuid().nullable().optional(),
  notifyAssignee: z.boolean().optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().min(1).max(10000).optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    assigneeId: z.string().uuid().optional(),
    dueAt: z.coerce.date().nullable().optional(),
    entityType: z.string().trim().max(100).nullable().optional(),
    entityId: z.string().uuid().nullable().optional(),
    requiresEvidence: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

export const taskIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const completeTaskSchema = z.object({
  completionNotes: z.string().trim().max(5000).nullable().optional(),
});

export const rejectTaskSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
});

export const cancelTaskSchema = z.object({
  reason: z.string().trim().max(2000).optional(),
});

export const waitTaskSchema = z.object({
  note: z.string().trim().max(2000).optional(),
});

export const escalateTaskSchema = z.object({
  note: z.string().trim().max(2000).optional(),
});

export const evidenceUploadSchema = z.object({
  originalFileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  contentBase64: z.string().min(1),
  description: z.string().trim().max(2000).nullable().optional(),
});

export const assignTaskSchema = z
  .object({
    assigneeId: z.string().uuid().optional(),
    assignedGroupId: z.string().uuid().nullable().optional(),
  })
  .refine((v) => v.assigneeId != null || v.assignedGroupId !== undefined, {
    message: 'assigneeId أو assignedGroupId مطلوب',
  });

export const reassignTaskSchema = z
  .object({
    assigneeId: z.string().uuid().optional(),
    assignedGroupId: z.string().uuid().nullable().optional(),
    reason: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => v.assigneeId != null || v.assignedGroupId !== undefined, {
    message: 'assigneeId أو assignedGroupId مطلوب',
  });

export type CreateTaskBody = z.infer<typeof createTaskSchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskSchema>;
