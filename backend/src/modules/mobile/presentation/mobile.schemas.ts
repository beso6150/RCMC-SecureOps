import { MobileDevicePlatform } from '@prisma/client';
import { z } from 'zod';

const uuid = z.string().uuid({ message: 'معرّف غير صالح' });

export const syncPullQuerySchema = z.object({
  updatedSince: z.coerce.date().optional(),
  cursor: z.string().trim().max(64).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const syncBatchSchema = z.object({
  deviceUuid: z.string().trim().min(1).max(128).optional(),
  operations: z
    .array(
      z.object({
        idempotencyKey: z.string().trim().min(1, 'مفتاح التكرار مطلوب').max(128),
        operationType: z.string().trim().min(1).max(64),
        entityType: z.string().trim().min(1).max(64),
        localEntityId: z.string().trim().max(128).nullable().optional(),
        payload: z.record(z.unknown()).default({}),
        clientCreatedAt: z.coerce.date().nullable().optional(),
      }),
    )
    .min(1, 'يجب إرسال عملية واحدة واحدةً على الأقل')
    .max(50),
});

export const registerDeviceSchema = z.object({
  deviceUuid: z.string().trim().min(1, 'معرّف الجهاز مطلوب').max(128),
  platform: z.nativeEnum(MobileDevicePlatform),
  appVersion: z.string().trim().min(1).max(32),
  deviceNameMasked: z.string().trim().max(100).nullable().optional(),
  /** Stored only when explicitly true — does not mean push delivery works */
  pushCapability: z.boolean().optional(),
});

export const unregisterDeviceSchema = z.object({
  deviceUuid: z.string().trim().min(1, 'معرّف الجهاز مطلوب').max(128),
});

export const deviceIdParamsSchema = z.object({
  id: uuid,
});

export const listDevicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type SyncBatchBody = z.infer<typeof syncBatchSchema>;
export type RegisterDeviceBody = z.infer<typeof registerDeviceSchema>;
export type UnregisterDeviceBody = z.infer<typeof unregisterDeviceSchema>;
