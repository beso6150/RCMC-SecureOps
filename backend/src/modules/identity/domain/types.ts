import { UserStatus } from '@prisma/client';
import { RoleCode } from './roleCodes.js';

export interface AuthContext {
  /** When true, supervisor may view phone numbers under policy. */
  incidentHandling?: boolean;
}

export interface AuthenticatedUser {
  id: string;
  nationalId: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  status: UserStatus;
  isFirstLogin: boolean;
  lastLoginAt: Date | null;
  roleId: string;
  roleCode: RoleCode | string;
  roleNameEn: string;
  roleNameAr: string;
  departmentId: string | null;
  departmentNameAr: string | null;
  shiftId: string | null;
  shiftNameAr: string | null;
  permissions: string[];
}

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface PolicyConditions {
  effect: 'allow' | 'deny';
  /** If set, policy only applies to these role codes. */
  appliesToRoles?: string[];
  when?: {
    field?: string;
    unless?: string;
    require?: string;
  };
}
