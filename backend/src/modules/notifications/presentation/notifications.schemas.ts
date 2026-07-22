import { NotificationCategory, NotificationPriority, NotificationStatus } from '@prisma/client';
import { z } from 'zod';

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(NotificationStatus).optional(),
  priority: z.nativeEnum(NotificationPriority).optional(),
  category: z.nativeEnum(NotificationCategory).optional(),
  isRead: z
    .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true' || v === '1')),
});

export const notificationIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const upsertPreferenceSchema = z.object({
  category: z.nativeEnum(NotificationCategory),
  inAppEnabled: z.boolean().optional(),
  socketEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursFrom: z.string().trim().max(8).nullable().optional(),
  quietHoursTo: z.string().trim().max(8).nullable().optional(),
  minimumPriority: z.nativeEnum(NotificationPriority).optional(),
});

export const createRuleSchema = z.object({
  name: z.string().trim().min(1).max(200),
  eventType: z.string().trim().min(1).max(120),
  category: z.nativeEnum(NotificationCategory),
  minimumSeverity: z.string().trim().max(40).nullable().optional(),
  targetRolesJson: z.unknown().optional(),
  targetGroupsJson: z.unknown().optional(),
  notificationPriority: z.nativeEnum(NotificationPriority).optional(),
  requiresAcknowledgement: z.boolean().optional(),
  reminderAfterMinutes: z.number().int().positive().nullable().optional(),
  escalationAfterMinutes: z.number().int().positive().nullable().optional(),
  maxReminders: z.number().int().min(0).max(10).optional(),
  isActive: z.boolean().optional(),
});

export const updateRuleSchema = createRuleSchema
  .partial()
  .omit({ eventType: true, category: true })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });

export const ruleIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const snoozeNotificationSchema = z
  .object({
    until: z.coerce.date().optional(),
    minutes: z.number().int().positive().max(60 * 24 * 14).optional(),
  })
  .refine((v) => v.until != null || v.minutes != null, {
    message: 'until أو minutes مطلوب',
  });

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
