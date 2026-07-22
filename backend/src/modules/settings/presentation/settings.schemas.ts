import { z } from 'zod';

export const createDepartmentSchema = z.object({
  code: z.string().trim().min(1).max(20),
  nameEn: z.string().trim().min(1).max(200),
  nameAr: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
});

export const updateDepartmentSchema = createDepartmentSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: 'At least one field is required' },
);

export const createShiftSchema = z.object({
  code: z.string().trim().min(1).max(20),
  nameEn: z.string().trim().min(1).max(200),
  nameAr: z.string().trim().min(1).max(200),
  startTime: z.string().trim().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().trim().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().trim().max(64).optional(),
});

export const updateShiftSchema = createShiftSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: 'At least one field is required' },
);

export const entityIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const settingKeyParamsSchema = z.object({
  key: z.string().trim().min(1).max(100),
});

export const upsertSystemSettingsSchema = z.object({
  settings: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(100),
        value: z.unknown(),
        description: z.string().trim().max(2000).nullable().optional(),
        isPublic: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(50),
});

export const upsertSystemSettingSchema = z.object({
  value: z.unknown(),
});
