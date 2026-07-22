import { ComplaintStatus } from '@prisma/client';
import { z } from 'zod';

export const createComplaintSchema = z.object({
  title: z.string().trim().min(2).max(300),
  description: z.string().trim().min(5).max(10000),
  locationId: z.string().uuid().nullable().optional(),
});

export const updateComplaintSchema = z
  .object({
    title: z.string().trim().min(2).max(300).optional(),
    description: z.string().trim().min(5).max(10000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

export const reviewComplaintSchema = z.object({
  status: z.enum([
    ComplaintStatus.APPROVED,
    ComplaintStatus.REJECTED,
    ComplaintStatus.UNDER_REVIEW,
    ComplaintStatus.CLOSED,
  ]),
  reviewNotes: z.string().trim().max(5000).nullable().optional(),
});

export const listComplaintsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(ComplaintStatus).optional(),
  search: z.string().trim().max(200).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const statisticsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const complaintIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type CreateComplaintBody = z.infer<typeof createComplaintSchema>;
export type UpdateComplaintBody = z.infer<typeof updateComplaintSchema>;
export type ReviewComplaintBody = z.infer<typeof reviewComplaintSchema>;
