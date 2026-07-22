import { AuthenticatedUser, AuthContext } from '../domain/types.js';
import { authorizationService } from '../application/AuthorizationService.js';
import { RoleCodes } from '../domain/roleCodes.js';

const MASKED_PHONE = '***';

export interface SerializableUser {
  id: string;
  nationalId: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  status: string;
  isFirstLogin: boolean;
  lastLoginAt: Date | null;
  roleId: string;
  departmentId: string | null;
  shiftId: string | null;
  groupId?: string | null;
  operationalStatus?: string;
  createdAt?: Date;
  updatedAt?: Date;
  role?: {
    id: string;
    code: string;
    nameEn: string;
    nameAr: string;
  };
  department?: { id: string; code: string; nameEn: string; nameAr: string } | null;
  shift?: { id: string; code: string; nameEn: string; nameAr: string } | null;
  group?: { id: string; code: string; nameEn: string; nameAr: string } | null;
}

/**
 * Field-level phone policy:
 * - Security Guard: never sees phone
 * - Security Supervisor: only when incidentHandling context + users:read_phone policy allows
 * - Security Director / others with unrestricted users:read_phone: full phone
 */
export async function applyPhonePolicy<T extends { phone?: string | null }>(
  viewer: AuthenticatedUser,
  record: T,
  context: AuthContext = {},
): Promise<T> {
  if (viewer.roleCode === RoleCodes.SECURITY_DIRECTOR) {
    return record;
  }

  const canRead = await authorizationService.canReadPhone(viewer, context);
  if (canRead) {
    return record;
  }

  return { ...record, phone: record.phone ? MASKED_PHONE : null };
}

export async function serializeUser(
  viewer: AuthenticatedUser,
  user: SerializableUser,
  context: AuthContext = {},
): Promise<SerializableUser> {
  const withPolicy = await applyPhonePolicy(viewer, user, context);
  return withPolicy;
}

export async function serializeUsers(
  viewer: AuthenticatedUser,
  users: SerializableUser[],
  context: AuthContext = {},
): Promise<SerializableUser[]> {
  return Promise.all(users.map((u) => serializeUser(viewer, u, context)));
}
