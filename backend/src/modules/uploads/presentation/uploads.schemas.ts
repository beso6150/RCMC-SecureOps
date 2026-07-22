import { z } from 'zod';

export const uploadBase64Schema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(3).max(120),
  contentBase64: z.string().min(1),
  folder: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]{1,40}$/i)
    .optional(),
});

export type UploadBase64Body = z.infer<typeof uploadBase64Schema>;
