import {
  AttachmentType,
  IncidentAssignmentType,
  IncidentContactType,
  IncidentNoteType,
  IncidentNoteVisibility,
  IncidentSeverity,
} from '@prisma/client';
import { z } from 'zod';

export const operationsStatsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const operationsLiveQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export const assessIncidentSchema = z.object({
  assessmentJson: z.unknown().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export const assignOpsSchema = z.object({
  assignedUserId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  assignedGroupId: z.string().uuid().nullable().optional(),
  assignmentType: z.nativeEnum(IncidentAssignmentType).optional(),
  reason: z.string().trim().max(2000).nullable().optional(),
  supervisorId: z.string().uuid().nullable().optional(),
  opsManagerId: z.string().uuid().nullable().optional(),
});

export const reassignIncidentSchema = z.object({
  assignedUserId: z.string().uuid(),
  reason: z.string().trim().max(2000).nullable().optional(),
  assignmentType: z.nativeEnum(IncidentAssignmentType).optional(),
});

export const resolveIncidentSchema = z.object({
  resolutionSummary: z.string().trim().max(10000).nullable().optional(),
  rootCause: z.string().trim().max(5000).nullable().optional(),
  actionsTaken: z.string().trim().max(10000).nullable().optional(),
  recommendations: z.string().trim().max(5000).nullable().optional(),
  requiresFollowUp: z.boolean().optional(),
  followUpDueAt: z.coerce.date().nullable().optional(),
});

export const reopenIncidentSchema = z.object({
  reason: z.string().trim().max(2000).nullable().optional(),
});

export const falseAlarmSchema = z.object({
  reason: z.string().trim().min(2).max(2000),
});

export const escalateIncidentSchema = z.object({
  reason: z.string().trim().max(2000).nullable().optional(),
});

export const requestSupportSchema = z.object({
  assignedUserId: z.string().uuid().nullable().optional(),
  assignedGroupId: z.string().uuid().nullable().optional(),
  assignmentType: z.nativeEnum(IncidentAssignmentType).optional(),
  reason: z.string().trim().max(2000).nullable().optional(),
});

export const addNoteSchema = z.object({
  content: z.string().trim().min(1).max(10000),
  noteType: z.nativeEnum(IncidentNoteType).optional(),
  visibility: z.nativeEnum(IncidentNoteVisibility).optional(),
});

export const addContactLogSchema = z.object({
  contactType: z.nativeEnum(IncidentContactType),
  organizationName: z.string().trim().max(200).nullable().optional(),
  contactPerson: z.string().trim().max(200).nullable().optional(),
  phoneNumberMasked: z.string().trim().max(50).nullable().optional(),
  result: z.string().trim().min(1).max(5000),
  referenceNumber: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  contactedAt: z.coerce.date().optional(),
});

export const addTaskSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5000).nullable().optional(),
  assignedUserId: z.string().uuid().nullable().optional(),
  assignedGroupId: z.string().uuid().nullable().optional(),
  priority: z.nativeEnum(IncidentSeverity).optional(),
  dueAt: z.coerce.date().nullable().optional(),
});

export const completeTaskSchema = z.object({
  completionNotes: z.string().trim().max(5000).nullable().optional(),
});

export const addFollowUpSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(10000),
  assignedToId: z.string().uuid().nullable().optional(),
  dueAt: z.coerce.date(),
});

export const completeFollowUpSchema = z.object({
  result: z.string().trim().max(5000).nullable().optional(),
});

export const convertForceSchema = z.object({
  force: z.boolean().optional(),
});

export const uploadOpsAttachmentSchema = z.object({
  originalFileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(3).max(150),
  contentBase64: z.string().min(1),
  description: z.string().trim().max(2000).nullable().optional(),
  type: z.nativeEnum(AttachmentType).optional(),
});

export const createProcedureSchema = z.object({
  name: z.string().trim().min(2).max(200),
  code: z.string().trim().min(2).max(50),
  incidentTypeCode: z.string().trim().min(2).max(50),
  severity: z.nativeEnum(IncidentSeverity).nullable().optional(),
  description: z.string().trim().min(2).max(10000),
  instructionsJson: z.unknown(),
  isActive: z.boolean().optional(),
});

export const updateProcedureSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    incidentTypeCode: z.string().trim().min(2).max(50).optional(),
    severity: z.nativeEnum(IncidentSeverity).nullable().optional(),
    description: z.string().trim().min(2).max(10000).optional(),
    instructionsJson: z.unknown().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'حقل واحد على الأقل مطلوب' });

export const procedureIdParamsSchema = z.object({
  procedureId: z.string().uuid(),
});

export const attachmentIdParamsSchema = z.object({
  id: z.string().uuid(),
  attachmentId: z.string().uuid(),
});

export const taskIdParamsSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
});

export const followUpIdParamsSchema = z.object({
  id: z.string().uuid(),
  followUpId: z.string().uuid(),
});

export const applyProcedureSchema = z.object({
  procedureId: z.string().uuid(),
});

export const completeProcedureStepSchema = z.object({
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const referralIdParamsSchema = z.object({
  referralId: z.string().uuid(),
});

export const alertIdParamsSchema = z.object({
  alertId: z.string().uuid(),
});

export const violationIdParamsSchema = z.object({
  violationId: z.string().uuid(),
});
