import {
  PermitImportance,
  ReferralAttachmentType,
  SecurityPermitStatus,
  SecurityPermitType,
  SecurityReferralSeverity,
  SecurityReferralStatus,
  SecurityReferralType,
} from '@prisma/client';
import { z } from 'zod';

const uuid = z.string().uuid({ message: 'معرّف غير صالح' });

const dateCoerce = z.coerce.date({
  errorMap: () => ({ message: 'تاريخ غير صالح' }),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  sortBy: z.string().trim().max(50).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  search: z.string().trim().max(200).optional(),
});

export const idParamsSchema = z.object({ id: uuid });

export const attachmentParamsSchema = z.object({
  id: uuid,
  attachmentId: uuid,
});

export const statisticsQuerySchema = z.object({
  from: dateCoerce.optional(),
  to: dateCoerce.optional(),
});

const fileAttachmentSchema = z.object({
  originalFileName: z.string().trim().min(1, 'اسم الملف مطلوب').max(180),
  mimeType: z.string().trim().min(1, 'نوع الملف مطلوب').max(120),
  contentBase64: z.string().min(1, 'محتوى الملف مطلوب'),
});

export const listPermitsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(SecurityPermitStatus).optional(),
  permitType: z.nativeEnum(SecurityPermitType).optional(),
  importance: z.nativeEnum(PermitImportance).optional(),
  createdById: uuid.optional(),
});

export const createPermitSchema = z.object({
  permitType: z.nativeEnum(SecurityPermitType, { errorMap: () => ({ message: 'نوع التصريح غير صالح' }) }),
  title: z.string().trim().min(1, 'عنوان التصريح مطلوب').max(200),
  holderName: z.string().trim().min(1, 'اسم صاحب التصريح مطلوب').max(200),
  nationalId: z.string().trim().max(20).nullable().optional(),
  employeeNumber: z.string().trim().max(50).nullable().optional(),
  companyName: z.string().trim().max(200).nullable().optional(),
  vehiclePlate: z.string().trim().max(30).nullable().optional(),
  vehicleType: z.string().trim().max(80).nullable().optional(),
  hostName: z.string().trim().max(200).nullable().optional(),
  hostDepartment: z.string().trim().max(200).nullable().optional(),
  allowedZoneId: uuid.nullable().optional(),
  allowedFloor: z.string().trim().max(50).nullable().optional(),
  validFrom: dateCoerce,
  validTo: dateCoerce,
  importance: z.nativeEnum(PermitImportance).optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  attachment: fileAttachmentSchema.nullable().optional(),
});

export const updatePermitSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  holderName: z.string().trim().min(1).max(200).optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  importance: z.nativeEnum(PermitImportance).optional(),
  allowedZoneId: uuid.nullable().optional(),
  allowedFloor: z.string().trim().max(50).nullable().optional(),
  validFrom: dateCoerce.optional(),
  validTo: dateCoerce.optional(),
  vehiclePlate: z.string().trim().max(30).nullable().optional(),
  vehicleType: z.string().trim().max(80).nullable().optional(),
  hostName: z.string().trim().max(200).nullable().optional(),
  hostDepartment: z.string().trim().max(200).nullable().optional(),
  nationalId: z.string().trim().max(20).nullable().optional(),
  employeeNumber: z.string().trim().max(50).nullable().optional(),
  companyName: z.string().trim().max(200).nullable().optional(),
});

export const reasonSchema = z.object({
  reason: z.string().trim().min(1, 'السبب مطلوب').max(2000),
});

export const sharePermitSchema = z.object({
  sharedWithUserId: uuid.nullable().optional(),
  sharedWithGroupId: uuid.nullable().optional(),
  sharedWithRole: z.string().trim().max(80).nullable().optional(),
  message: z.string().trim().max(2000).nullable().optional(),
});

export const acknowledgeShareSchema = z.object({
  mode: z.enum(['view', 'acknowledge']).optional().default('acknowledge'),
});

export const listReferralsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(SecurityReferralStatus).optional(),
  severity: z.nativeEnum(SecurityReferralSeverity).optional(),
  referralType: z.nativeEnum(SecurityReferralType).optional(),
  assignedUserId: uuid.optional(),
  createdById: uuid.optional(),
  zoneId: uuid.optional(),
  from: dateCoerce.optional(),
  to: dateCoerce.optional(),
});

export const createReferralSchema = z.object({
  title: z.string().trim().min(1, 'عنوان الإحالة مطلوب').max(200),
  description: z.string().trim().min(1, 'وصف الإحالة مطلوب').max(10_000),
  referralType: z.nativeEnum(SecurityReferralType, {
    errorMap: () => ({ message: 'نوع الإحالة غير صالح' }),
  }),
  severity: z.nativeEnum(SecurityReferralSeverity).optional(),
  zoneId: uuid.nullable().optional(),
  checkpointId: uuid.nullable().optional(),
  floorNumber: z.number().int().nullable().optional(),
  cameraCode: z.string().trim().max(80).nullable().optional(),
  occurredAt: dateCoerce.optional(),
  assignedUserId: uuid.nullable().optional(),
  assignedGroupId: uuid.nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  sendImmediately: z.boolean().optional(),
  sendToSupervisor: z.boolean().optional(),
  attachments: z
    .array(
      fileAttachmentSchema.extend({
        attachmentType: z.nativeEnum(ReferralAttachmentType).optional(),
        description: z.string().trim().max(2000).nullable().optional(),
      }),
    )
    .max(10)
    .optional(),
});

export const updateReferralSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().min(1).max(10_000).optional(),
  referralType: z.nativeEnum(SecurityReferralType).optional(),
  severity: z.nativeEnum(SecurityReferralSeverity).optional(),
  zoneId: uuid.nullable().optional(),
  checkpointId: uuid.nullable().optional(),
  floorNumber: z.number().int().nullable().optional(),
  cameraCode: z.string().trim().max(80).nullable().optional(),
  occurredAt: dateCoerce.optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export const assignReferralSchema = z.object({
  assignedUserId: uuid,
  message: z.string().trim().max(2000).nullable().optional(),
});

export const resolveReferralSchema = z.object({
  resolutionSummary: z.string().trim().min(1, 'ملخص النتيجة مطلوب').max(5000),
  notes: z.string().trim().max(5000).nullable().optional(),
  needsFollowUp: z.boolean().optional(),
  attachment: fileAttachmentSchema.nullable().optional(),
});

export const escalateReferralSchema = z.object({
  reason: z.string().trim().min(1, 'سبب التصعيد مطلوب').max(2000),
  level: z.number().int().min(1).max(10).optional(),
});

export const closeReferralSchema = z.object({
  note: z.string().trim().max(2000).nullable().optional(),
});

export const noteSchema = z.object({
  message: z.string().trim().min(1, 'نص الملاحظة مطلوب').max(5000),
});

export const requestInfoSchema = z.object({
  message: z.string().trim().min(1, 'نص طلب المعلومات مطلوب').max(5000),
});

export const addAttachmentSchema = fileAttachmentSchema.extend({
  attachmentType: z.nativeEnum(ReferralAttachmentType).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
});

export type CreatePermitBody = z.infer<typeof createPermitSchema>;
export type UpdatePermitBody = z.infer<typeof updatePermitSchema>;
export type SharePermitBody = z.infer<typeof sharePermitSchema>;
export type ReasonBody = z.infer<typeof reasonSchema>;
export type AcknowledgeShareBody = z.infer<typeof acknowledgeShareSchema>;
export type CreateReferralBody = z.infer<typeof createReferralSchema>;
export type UpdateReferralBody = z.infer<typeof updateReferralSchema>;
export type AssignReferralBody = z.infer<typeof assignReferralSchema>;
export type ResolveReferralBody = z.infer<typeof resolveReferralSchema>;
export type EscalateReferralBody = z.infer<typeof escalateReferralSchema>;
export type CloseReferralBody = z.infer<typeof closeReferralSchema>;
export type NoteBody = z.infer<typeof noteSchema>;
export type RequestInfoBody = z.infer<typeof requestInfoSchema>;
export type AddAttachmentBody = z.infer<typeof addAttachmentSchema>;
