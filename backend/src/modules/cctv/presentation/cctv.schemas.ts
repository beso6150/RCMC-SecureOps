import { CameraRequestStatus } from '@prisma/client';
import { z } from 'zod';

export const searchPermitsQuerySchema = z.object({
  plateNumber: z.string().trim().min(2).max(20),
});

export const listCameraRequestsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(CameraRequestStatus).optional(),
  mine: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((v) => v === true || v === 'true'),
  plateNumber: z.string().trim().min(2).max(20).optional(),
});

export const createCameraRequestSchema = z.object({
  plateNumber: z.string().trim().min(2).max(20),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export const completeCameraRequestSchema = z.object({
  employeeName: z.string().trim().max(255).nullable().optional(),
  departmentName: z.string().trim().max(255).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  permitStatus: z.string().trim().max(50).nullable().optional(),
  vehicleType: z.string().trim().max(100).nullable().optional(),
  ownerName: z.string().trim().max(255).nullable().optional(),
  permitId: z.string().uuid().nullable().optional(),
  responseNotes: z.string().trim().max(5000).nullable().optional(),
});

export const cameraRequestIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type CreateCameraRequestBody = z.infer<typeof createCameraRequestSchema>;
export type CompleteCameraRequestBody = z.infer<typeof completeCameraRequestSchema>;
