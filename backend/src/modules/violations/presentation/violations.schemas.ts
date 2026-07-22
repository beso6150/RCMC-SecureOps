import { ParkingLocationCode, VehicleViolationStatus, ViolationType } from '@prisma/client';
import { z } from 'zod';

const attachmentSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(3).max(150),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024),
  storageKey: z.string().trim().min(1).max(500),
  imagePath: z.string().trim().min(1).max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
});

export const createViolationSchema = z.object({
  plateNumber: z.string().trim().min(2).max(20),
  ocrResult: z.string().trim().max(5000).nullable().optional(),
  ocrConfidence: z.number().min(0).max(1).nullable().optional(),
  arabicPlate: z.string().trim().max(50).nullable().optional(),
  englishPlate: z.string().trim().max(50).nullable().optional(),
  vehicleColor: z.string().trim().max(50).nullable().optional(),
  violationType: z.nativeEnum(ViolationType),
  parkingCode: z.nativeEnum(ParkingLocationCode),
  gpsLatitude: z.number().min(-90).max(90).nullable().optional(),
  gpsLongitude: z.number().min(-180).max(180).nullable().optional(),
  imagePath: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  clientSyncId: z.string().uuid().optional(),
  detectedAt: z.coerce.date().optional(),
  autoAssign: z.boolean().optional(),
  supervisorId: z.string().uuid().nullable().optional(),
  cctvOperatorId: z.string().uuid().nullable().optional(),
  attachments: z.array(attachmentSchema).max(20).optional(),
});

export const updateViolationSchema = z
  .object({
    plateNumber: z.string().trim().min(2).max(20).optional(),
    ocrResult: z.string().trim().max(5000).nullable().optional(),
    ocrConfidence: z.number().min(0).max(1).nullable().optional(),
    arabicPlate: z.string().trim().max(50).nullable().optional(),
    englishPlate: z.string().trim().max(50).nullable().optional(),
    vehicleColor: z.string().trim().max(50).nullable().optional(),
    violationType: z.nativeEnum(ViolationType).optional(),
    parkingCode: z.nativeEnum(ParkingLocationCode).optional(),
    gpsLatitude: z.number().min(-90).max(90).nullable().optional(),
    gpsLongitude: z.number().min(-180).max(180).nullable().optional(),
    imagePath: z.string().trim().max(500).nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    status: z.nativeEnum(VehicleViolationStatus).optional(),
    supervisorId: z.string().uuid().nullable().optional(),
    cctvOperatorId: z.string().uuid().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

export const assignViolationSchema = z
  .object({
    supervisorId: z.string().uuid().nullable().optional(),
    cctvOperatorId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (v) => v.supervisorId !== undefined || v.cctvOperatorId !== undefined || true,
    { message: 'Provide supervisorId and/or cctvOperatorId, or omit both for auto-assign' },
  );

export const closeViolationSchema = z.object({
  notes: z.string().trim().max(5000).nullable().optional(),
  status: z.enum(['RESOLVED', 'CANCELLED']).optional(),
});

export const addAttachmentsSchema = z.object({
  attachments: z.array(attachmentSchema).min(1).max(20),
});

export const listViolationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(VehicleViolationStatus).optional(),
  parkingCode: z.nativeEnum(ParkingLocationCode).optional(),
  locationId: z.string().uuid().optional(),
  createdById: z.string().uuid().optional(),
  supervisorId: z.string().uuid().optional(),
  cctvOperatorId: z.string().uuid().optional(),
  violationType: z.nativeEnum(ViolationType).optional(),
  plateNumber: z.string().trim().max(20).optional(),
  search: z.string().trim().max(100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const violationIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const statisticsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const syncPushSchema = z.object({
  items: z
    .array(
      createViolationSchema.extend({
        clientSyncId: z.string().uuid(),
      }),
    )
    .min(1)
    .max(100),
});

export const syncPullQuerySchema = z.object({
  since: z.string().datetime({ offset: true }).or(z.coerce.date().transform((d) => d.toISOString())),
});

export type CreateViolationBody = z.infer<typeof createViolationSchema>;
export type UpdateViolationBody = z.infer<typeof updateViolationSchema>;
export type SyncPushBody = z.infer<typeof syncPushSchema>;
