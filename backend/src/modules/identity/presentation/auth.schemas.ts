import { z } from 'zod';

export const loginSchema = z.object({
  nationalId: z.string().trim().min(10).max(20),
  employeeNumber: z.string().trim().min(1).max(50),
  /** Optional; defaults to employeeNumber when omitted (first-login default). */
  password: z.string().min(1).max(128).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(10).max(128),
});

export type LoginBody = z.infer<typeof loginSchema>;
export type RefreshBody = z.infer<typeof refreshSchema>;
export type LogoutBody = z.infer<typeof logoutSchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordSchema>;
