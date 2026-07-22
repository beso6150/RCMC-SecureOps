import {
  HostCommunicationPreference,
  VisitEmailParseStatus,
  VisitImportance,
  VisitStatus,
} from '@prisma/client';
import { z } from 'zod';

export const createHostSchema = z.object({
  employeeNumber: z.string().trim().min(1).max(50),
  employeeName: z.string().trim().min(2).max(200),
  departmentId: z.string().uuid().nullable().optional(),
  phone: z.string().trim().min(8).max(20).nullable().optional(),
  email: z.string().trim().email().max(255).nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
  communicationPreference: z.nativeEnum(HostCommunicationPreference).optional(),
  whatsappEnabled: z.boolean().optional(),
  phoneCallEnabled: z.boolean().optional(),
});

export const updateHostSchema = createHostSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'At least one field is required',
});

export const createVisitorSchema = z.object({
  visitorName: z.string().trim().min(2).max(200),
  nationalId: z.string().trim().min(10).max(20).nullable().optional(),
  organization: z.string().trim().max(200).nullable().optional(),
  mobile: z.string().trim().min(8).max(20).nullable().optional(),
  vehiclePlate: z.string().trim().max(20).nullable().optional(),
  visitDate: z.coerce.date(),
  arrivalTime: z.coerce.date().nullable().optional(),
  departureTime: z.coerce.date().nullable().optional(),
  importance: z.nativeEnum(VisitImportance).optional(),
  purpose: z.string().trim().max(5000).nullable().optional(),
  hostId: z.string().uuid(),
  floorId: z.string().uuid().nullable().optional(),
  meetingRoomId: z.string().uuid().nullable().optional(),
  locationId: z.string().uuid().nullable().optional(),
  badgeNumber: z.string().trim().max(50).nullable().optional(),
});

export const updateVisitorSchema = createVisitorSchema
  .partial()
  .extend({
    status: z.nativeEnum(VisitStatus).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

export const listVisitorsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(VisitStatus).optional(),
  importance: z.nativeEnum(VisitImportance).optional(),
  hostId: z.string().uuid().optional(),
  floorId: z.string().uuid().optional(),
  meetingRoomId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  visitDate: z.coerce.date().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().trim().max(100).optional(),
});

export const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listHostsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
});

export const updateFloorSchema = z
  .object({
    code: z.string().trim().min(1).max(50).optional(),
    nameEn: z.string().trim().min(1).max(150).optional(),
    nameAr: z.string().trim().min(1).max(150).optional(),
    level: z.number().int().min(-10).max(200).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

export const createMeetingRoomSchema = z.object({
  floorId: z.string().uuid(),
  code: z.string().trim().min(1).max(50),
  nameEn: z.string().trim().min(1).max(150),
  nameAr: z.string().trim().min(1).max(150),
  capacity: z.number().int().positive().max(5000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateMeetingRoomSchema = createMeetingRoomSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

export const listMeetingRoomsQuerySchema = z.object({
  floorId: z.string().uuid().optional(),
});

export const statisticsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const ingestEmailSchema = z.object({
  subject: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(100_000),
  receivedAt: z.coerce.date(),
  senderEmail: z.string().trim().email().max(255),
  visitorId: z.string().uuid().nullable().optional(),
  rawHeaders: z.record(z.unknown()).optional(),
});

export const listEmailsQuerySchema = z.object({
  parseStatus: z.nativeEnum(VisitEmailParseStatus).optional(),
});
