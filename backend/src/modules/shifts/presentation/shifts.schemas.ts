import { OperationalStatus } from '@prisma/client';
import { z } from 'zod';

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const listPersonnelQuerySchema = z.object({
  roleCodes: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const raw = Array.isArray(value) ? value : value.split(',');
      return raw.map((v) => v.trim()).filter(Boolean);
    }),
});

export const userIdParamsSchema = z.object({
  userId: z.string().uuid(),
});

export const handoverIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const setOperationalStatusSchema = z.object({
  status: z.nativeEnum(OperationalStatus),
});

export const updateCycleConfigSchema = z.object({
  cycleStartDate: z.coerce.date().optional(),
  morningStartTime: z.string().regex(timePattern).optional(),
  morningEndTime: z.string().regex(timePattern).optional(),
  eveningStartTime: z.string().regex(timePattern).optional(),
  eveningEndTime: z.string().regex(timePattern).optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
});

export const upsertHandoverSchema = z.object({
  sessionId: z.string().uuid(),
  outgoingSupervisorId: z.string().uuid(),
  incomingSupervisorId: z.string().uuid(),
  notes: z.string().trim().max(10000).nullable().optional(),
  equipmentNotes: z.string().trim().max(10000).nullable().optional(),
});

export const shiftStatisticsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type SetOperationalStatusBody = z.infer<typeof setOperationalStatusSchema>;
export type UpdateCycleConfigBody = z.infer<typeof updateCycleConfigSchema>;
export type UpsertHandoverBody = z.infer<typeof upsertHandoverSchema>;
