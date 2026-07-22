import { z } from 'zod';
import {
  AuditAction,
  AuditSeverity,
  ReportScheduleFrequency,
  SavedReportStatus,
  SavedReportType,
} from '@prisma/client';
import { CUSTOM_REPORT_DATA_SOURCES } from '../application/CustomReportService.js';

export const reportSummaryQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('daily'),
});

export const reportExportQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('daily'),
  format: z.enum(['pdf', 'csv']).default('csv'),
});

export const reportDashboardQuerySchema = z.object({
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).default('daily'),
});

export const kpiQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  groupId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
});

export const listSavedReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  reportType: z.nativeEnum(SavedReportType).optional(),
  status: z.nativeEnum(SavedReportStatus).optional(),
  generatedById: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const generateReportSchema = z.object({
  reportType: z.nativeEnum(SavedReportType),
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).nullable().optional(),
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
  shiftType: z.string().max(40).nullable().optional(),
  groupId: z.string().uuid().nullable().optional(),
  zoneId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
  sessionId: z.string().uuid().nullable().optional(),
  filtersJson: z.record(z.unknown()).optional(),
  notes: z.string().max(5000).nullable().optional(),
  recommendations: z.string().max(5000).nullable().optional(),
  classification: z
    .enum(['INTERNAL', 'CONFIDENTIAL', 'HIGHLY_CONFIDENTIAL'])
    .optional(),
});

export const customReportSchema = z.object({
  title: z.string().min(1).max(300),
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
  dataSources: z
    .array(z.enum(CUSTOM_REPORT_DATA_SOURCES as unknown as [string, ...string[]]))
    .min(1),
  fields: z.record(z.array(z.string())).optional(),
  groupId: z.string().uuid().nullable().optional(),
  zoneId: z.string().uuid().nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export const reportIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const approvalNotesSchema = z.object({
  notes: z.string().max(5000).nullable().optional(),
});

export const rejectNotesSchema = z.object({
  notes: z.string().min(1).max(5000),
});

export const scheduleBodySchema = z.object({
  name: z.string().min(1).max(200),
  reportType: z.nativeEnum(SavedReportType),
  frequency: z.nativeEnum(ReportScheduleFrequency),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  dayOfMonth: z.number().int().min(1).max(28).nullable().optional(),
  shiftType: z.string().max(40).nullable().optional(),
  groupId: z.string().uuid().nullable().optional(),
  filtersJson: z.record(z.unknown()).optional(),
  recipientsJson: z.unknown().optional(),
  generatePdf: z.boolean().optional(),
  generateCsv: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const scheduleUpdateSchema = scheduleBodySchema.partial();

export const auditLogsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  actorId: z.string().uuid().optional(),
  action: z.nativeEnum(AuditAction).optional(),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
  module: z.string().optional(),
  severity: z.nativeEnum(AuditSeverity).optional(),
  success: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  requestId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().optional(),
});

export const auditLogsExportSchema = auditLogsListQuerySchema;

export const auditLogIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type GenerateReportBody = z.infer<typeof generateReportSchema>;
export type CustomReportBody = z.infer<typeof customReportSchema>;
export type ScheduleBody = z.infer<typeof scheduleBodySchema>;
