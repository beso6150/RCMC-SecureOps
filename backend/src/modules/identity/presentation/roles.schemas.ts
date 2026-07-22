import { z } from 'zod';

export const roleIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const setRolePermissionsSchema = z.object({
  permissionIds: z.array(z.string().uuid()),
});

export type SetRolePermissionsBody = z.infer<typeof setRolePermissionsSchema>;
