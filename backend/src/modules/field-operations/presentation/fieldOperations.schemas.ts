import {
  CheckpointType,
  FieldAlertSeverity,
  FieldAlertStatus,
  FieldAlertType,
  PatrolSessionStatus,
  PatrolVerificationMethod,
  PatrolVisitStatus,
  PersonnelLocationSource,
  SecurityZoneType,
} from '@prisma/client';
import { z } from 'zod';

const uuid = z.string().uuid({ message: 'معرّف غير صالح' });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.string().trim().max(50).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  search: z.string().trim().max(200).optional(),
  isActive: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === 'boolean') return v;
      return v === 'true';
    }),
});

export const idParamsSchema = z.object({
  id: uuid,
});

export const userIdParamsSchema = z.object({
  userId: uuid,
});

export const sessionCheckpointParamsSchema = z.object({
  id: uuid,
  checkpointId: uuid,
});

export const incidentIdParamsSchema = z.object({
  incidentId: uuid,
});

export const listZonesQuerySchema = paginationQuerySchema.extend({
  zoneType: z.nativeEnum(SecurityZoneType).optional(),
  parentId: uuid.optional(),
});

export const createZoneSchema = z.object({
  name: z.string().trim().min(1, 'اسم المنطقة مطلوب').max(200),
  code: z.string().trim().min(1, 'رمز المنطقة مطلوب').max(50),
  description: z.string().trim().max(5000).nullable().optional(),
  zoneType: z.nativeEnum(SecurityZoneType),
  parentId: uuid.nullable().optional(),
  floorNumber: z.number().int().nullable().optional(),
  mapX: z.number().optional(),
  mapY: z.number().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  color: z.string().trim().max(30).optional(),
  isActive: z.boolean().optional(),
});

export const updateZoneSchema = createZoneSchema.partial();

export const listCheckpointsQuerySchema = paginationQuerySchema.extend({
  zoneId: uuid.optional(),
  checkpointType: z.nativeEnum(CheckpointType).optional(),
});

export const createCheckpointSchema = z.object({
  name: z.string().trim().min(1, 'اسم النقطة مطلوب').max(200),
  code: z.string().trim().min(1, 'رمز النقطة مطلوب').max(50),
  description: z.string().trim().max(5000).nullable().optional(),
  zoneId: uuid,
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  mapX: z.number().optional(),
  mapY: z.number().optional(),
  checkpointType: z.nativeEnum(CheckpointType).optional(),
  qrCodeValue: z.string().trim().min(1, 'قيمة QR مطلوبة').max(200),
  nfcTagValue: z.string().trim().max(200).nullable().optional(),
  requiredForPatrol: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateCheckpointSchema = createCheckpointSchema.partial();

export const routeCheckpointSchema = z.object({
  checkpointId: uuid,
  orderIndex: z.number().int().min(0),
  expectedMinutesFromStart: z.number().int().min(0).optional(),
  isRequired: z.boolean().optional(),
  instructions: z.string().trim().max(2000).nullable().optional(),
});

export const createRouteSchema = z.object({
  name: z.string().trim().min(1, 'اسم المسار مطلوب').max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  shiftType: z.string().trim().max(50).nullable().optional(),
  groupId: uuid.nullable().optional(),
  estimatedDurationMinutes: z.number().int().min(1).max(24 * 60).optional(),
  isActive: z.boolean().optional(),
  checkpoints: z.array(routeCheckpointSchema).min(1, 'أضف نقطة واحدة واحدةً واحدةً واحدةً واحدةً واحدةًً واحدةًا واحدةً على المسار'),
});

export const updateRouteSchema = createRouteSchema.partial().extend({
  checkpoints: z.array(routeCheckpointSchema).min(1).optional(),
});

export const listSessionsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(PatrolSessionStatus).optional(),
  assignedUserId: uuid.optional(),
  groupId: uuid.optional(),
  routeId: uuid.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const createSessionSchema = z.object({
  routeId: uuid,
  assignedUserId: uuid.nullable().optional(),
  scheduledStartAt: z.coerce.date({ required_error: 'وقت البدء مطلوب' }),
  notes: z.string().trim().max(5000).nullable().optional(),
  priority: z.number().int().min(1).max(1000).optional(),
  overrideReason: z.string().trim().max(2000).nullable().optional(),
});

export const updateSessionSchema = z.object({
  scheduledStartAt: z.coerce.date().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  priority: z.number().int().min(1).max(1000).optional(),
});

export const assignSessionSchema = z.object({
  assignedUserId: uuid,
  overrideReason: z.string().trim().max(2000).nullable().optional(),
});

export const visitCheckpointSchema = z.object({
  verificationMethod: z.nativeEnum(PatrolVerificationMethod).optional(),
  mapX: z.number().nullable().optional(),
  mapY: z.number().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  attachmentUrl: z.string().trim().max(500).nullable().optional(),
  status: z.nativeEnum(PatrolVisitStatus).optional(),
  clientSyncId: z.string().trim().max(100).nullable().optional(),
  qrCodeValue: z.string().trim().max(200).nullable().optional(),
});

export const cancelSessionSchema = z.object({
  reason: z.string().trim().min(1, 'سبب الإلغاء مطلوب').max(2000),
});

export const listPersonnelQuerySchema = paginationQuerySchema.extend({
  groupId: uuid.optional(),
});

export const locationUpdateSchema = z.object({
  mapX: z.number({ required_error: 'mapX مطلوب' }),
  mapY: z.number({ required_error: 'mapY مطلوب' }),
  zoneId: uuid.nullable().optional(),
  accuracy: z.number().nullable().optional(),
  source: z.nativeEnum(PersonnelLocationSource).optional(),
});

export const listAlertsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(FieldAlertStatus).optional(),
  severity: z.nativeEnum(FieldAlertSeverity).optional(),
  alertType: z.nativeEnum(FieldAlertType).optional(),
  assignedUserId: uuid.optional(),
});

export const createAlertSchema = z.object({
  title: z.string().trim().min(1, 'عنوان التنبيه مطلوب').max(200),
  description: z.string().trim().min(1, 'وصف التنبيه مطلوب').max(5000),
  alertType: z.nativeEnum(FieldAlertType),
  severity: z.nativeEnum(FieldAlertSeverity).optional(),
  zoneId: uuid.nullable().optional(),
  assignedUserId: uuid.nullable().optional(),
  assignedGroupId: uuid.nullable().optional(),
  incidentId: uuid.nullable().optional(),
  patrolSessionId: uuid.nullable().optional(),
  mapX: z.number().nullable().optional(),
  mapY: z.number().nullable().optional(),
});

export const sosSchema = z.object({
  description: z.string().trim().max(2000).nullable().optional(),
  zoneId: uuid.nullable().optional(),
  mapX: z.number().nullable().optional(),
  mapY: z.number().nullable().optional(),
});

export const resolveAlertSchema = z.object({
  resolutionNote: z.string().trim().min(1, 'ملاحظة الحل مطلوبة').max(5000),
});

export const cancelAlertSchema = z.object({
  reason: z.string().trim().max(2000).nullable().optional(),
});

export const statisticsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  groupId: uuid.optional(),
  userId: uuid.optional(),
  zoneId: uuid.optional(),
});

export type CreateZoneBody = z.infer<typeof createZoneSchema>;
export type UpdateZoneBody = z.infer<typeof updateZoneSchema>;
export type CreateCheckpointBody = z.infer<typeof createCheckpointSchema>;
export type UpdateCheckpointBody = z.infer<typeof updateCheckpointSchema>;
export type CreateRouteBody = z.infer<typeof createRouteSchema>;
export type UpdateRouteBody = z.infer<typeof updateRouteSchema>;
export type CreateSessionBody = z.infer<typeof createSessionSchema>;
export type UpdateSessionBody = z.infer<typeof updateSessionSchema>;
export type AssignSessionBody = z.infer<typeof assignSessionSchema>;
export type VisitCheckpointBody = z.infer<typeof visitCheckpointSchema>;
export type CancelSessionBody = z.infer<typeof cancelSessionSchema>;
export type LocationUpdateBody = z.infer<typeof locationUpdateSchema>;
export type CreateAlertBody = z.infer<typeof createAlertSchema>;
export type SosBody = z.infer<typeof sosSchema>;
export type ResolveAlertBody = z.infer<typeof resolveAlertSchema>;
export type CancelAlertBody = z.infer<typeof cancelAlertSchema>;
