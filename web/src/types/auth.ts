export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface AuthUser {
  id: string;
  nationalId: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  status: UserStatus;
  isFirstLogin: boolean;
  lastLoginAt: string | null;
  roleId: string;
  roleCode: string;
  roleNameEn: string;
  roleNameAr: string;
  departmentId: string | null;
  departmentNameAr: string | null;
  shiftId: string | null;
  shiftNameAr: string | null;
  permissions: string[];
}

export interface LoginPayload {
  nationalId: string;
  employeeNumber: string;
  password?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  mustChangePassword: boolean;
  user: {
    id: string;
    fullName: string;
    nationalId: string;
    employeeNumber: string;
    email: string;
    roleCode: string;
    isFirstLogin: boolean;
    status: UserStatus;
  };
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiErrorBody {
  success?: boolean;
  message?: string;
  code?: string;
}
