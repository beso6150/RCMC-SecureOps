import { UserStatus } from '@prisma/client';
import { z } from 'zod';

export const createUserSchema = z.object({
  nationalId: z.string().trim().min(10).max(20),
  employeeNumber: z.string().trim().min(1).max(50),
  fullName: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(8).max(20).nullable().optional(),
  jobTitle: z.string().trim().max(150).nullable().optional(),
  roleId: z.string().uuid(),
  departmentId: z.string().uuid().nullable().optional(),
  shiftId: z.string().uuid().nullable().optional(),
  groupId: z.string().uuid().nullable().optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export const updateUserSchema = createUserSchema.partial();

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().trim().max(200).optional(),
  roleId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const resetPasswordSchema = z.object({
  temporaryPassword: z.string().trim().min(6).max(128).optional(),
});

export type CreateUserBody = z.infer<typeof createUserSchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
