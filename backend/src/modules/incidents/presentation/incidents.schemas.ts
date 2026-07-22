import {
  IncidentSeverity,
  IncidentStatus,
  ParkingLocationCode,
} from '@prisma/client';
import { z } from 'zod';

const attachmentSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(3).max(150),
  fileSize: z.number().int().positive().max(50 * 1024 * 1024),
  storageKey: z.string().trim().min(1).max(500),
  localPath: z.string().trim().min(1).max(500).nullable().optional(),
});

const createIncidentBodySchema = z.object({
  typeId: z.string().uuid().optional(),
  typeCode: z.string().trim().min(1).max(50).optional(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().min(2).max(10000),
  notes: z.string().trim().max(5000).nullable().optional(),
  severity: z.nativeEnum(IncidentSeverity).optional(),
  parkingCode: z.nativeEnum(ParkingLocationCode).nullable().optional(),
  floorId: z.string().uuid().nullable().optional(),
  meetingRoomId: z.string().uuid().nullable().optional(),
  shiftId: z.string().uuid().nullable().optional(),
  zoneId: z.string().uuid().nullable().optional(),
  checkpointId: z.string().uuid().nullable().optional(),
  patrolSessionId: z.string().uuid().nullable().optional(),
  mapX: z.number().nullable().optional(),
  mapY: z.number().nullable().optional(),
  gpsLatitude: z.number().min(-90).max(90).nullable().optional(),
  gpsLongitude: z.number().min(-180).max(180).nullable().optional(),
  occurredAt: z.coerce.date().optional(),
  clientSyncId: z.string().uuid().optional(),
  autoAssign: z.boolean().optional(),
  supervisorId: z.string().uuid().nullable().optional(),
  opsManagerId: z.string().uuid().nullable().optional(),
  attachments: z.array(attachmentSchema).max(20).optional(),
});

export const createIncidentSchema = createIncidentBodySchema.refine(
  (v) => Boolean(v.typeId || v.typeCode),
  { message: 'typeId or typeCode is required' },
);

export const updateIncidentSchema = z
  .object({
    typeId: z.string().uuid().optional(),
    typeCode: z.string().trim().min(1).max(50).optional(),
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().min(2).max(10000).optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
    severity: z.nativeEnum(IncidentSeverity).optional(),
    parkingCode: z.nativeEnum(ParkingLocationCode).nullable().optional(),
    floorId: z.string().uuid().nullable().optional(),
    meetingRoomId: z.string().uuid().nullable().optional(),
    shiftId: z.string().uuid().nullable().optional(),
    zoneId: z.string().uuid().nullable().optional(),
    checkpointId: z.string().uuid().nullable().optional(),
    patrolSessionId: z.string().uuid().nullable().optional(),
    mapX: z.number().nullable().optional(),
    mapY: z.number().nullable().optional(),
    gpsLatitude: z.number().min(-90).max(90).nullable().optional(),
    gpsLongitude: z.number().min(-180).max(180).nullable().optional(),
    status: z.nativeEnum(IncidentStatus).optional(),
    supervisorId: z.string().uuid().nullable().optional(),
    opsManagerId: z.string().uuid().nullable().optional(),
    assigneeId: z.string().uuid().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

export const assignIncidentSchema = z.object({
  assigneeId: z.string().uuid().nullable().optional(),
  supervisorId: z.string().uuid().nullable().optional(),
  opsManagerId: z.string().uuid().nullable().optional(),
});

export const closeIncidentSchema = z.object({
  notes: z.string().trim().max(5000).nullable().optional(),
});

export const cancelIncidentSchema = z.object({
  notes: z.string().trim().max(5000).nullable().optional(),
});

export const holdIncidentSchema = z.object({
  notes: z.string().trim().max(5000).nullable().optional(),
});

export const addCommentSchema = z.object({
  body: z.string().trim().min(1).max(5000),
});

export const addAttachmentsSchema = z.object({
  attachments: z.array(attachmentSchema).min(1).max(20),
});

export const listIncidentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(IncidentStatus).optional(),
  severity: z.nativeEnum(IncidentSeverity).optional(),
  typeId: z.string().uuid().optional(),
  typeCode: z.string().trim().max(50).optional(),
  parkingCode: z.nativeEnum(ParkingLocationCode).optional(),
  locationId: z.string().uuid().optional(),
  floorId: z.string().uuid().optional(),
  meetingRoomId: z.string().uuid().optional(),
  reporterId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  supervisorId: z.string().uuid().optional(),
  opsManagerId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  mine: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((v) => v === true || v === 'true' || v === '1'),
});

export const incidentIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const incidentTypeIdParamsSchema = z.object({
  typeId: z.string().uuid(),
});

export const createIncidentTypeSchema = z.object({
  code: z.string().trim().min(1).max(50),
  nameAr: z.string().trim().min(1).max(200),
  nameEn: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  isActive: z.boolean().optional(),
});

export const updateIncidentTypeSchema = createIncidentTypeSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: 'At least one field is required' },
);

export const syncPushSchema = z.object({
  items: z
    .array(
      createIncidentBodySchema.extend({
        clientSyncId: z.string().uuid(),
      }),
    )
    .min(1)
    .max(100),
});

export const syncPullQuerySchema = z.object({
  since: z.string().datetime({ offset: true }).or(z.coerce.date().transform((d) => d.toISOString())),
});

export type CreateIncidentBody = z.infer<typeof createIncidentSchema>;
export type UpdateIncidentBody = z.infer<typeof updateIncidentSchema>;
export type SyncPushBody = z.infer<typeof syncPushSchema>;
