import type { ChartPoint, VisitorsByDayPoint } from './dashboard';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_FIRST_LOGIN';

export type ComplaintStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CLOSED';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type ViolationType =
  | 'ILLEGAL_PARKING'
  | 'NO_PERMIT'
  | 'EXPIRED_PERMIT'
  | 'BLOCKING'
  | 'UNAUTHORIZED_ZONE'
  | 'OTHER';

export interface PaginatedMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface RoleSummary {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  description: string | null;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { users: number; rolePermissions: number };
}

export interface RoleDetail extends RoleSummary {
  permissions: Permission[];
}

export interface Permission {
  id: string;
  code: string;
  resource: string;
  action: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { rolePermissions: number; permissionPolicies: number };
}

export interface Department {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Shift {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  startTime: string;
  endTime: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserRecord {
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
  departmentId: string | null;
  shiftId: string | null;
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
  role?: { id: string; code: string; nameEn: string; nameAr: string };
  department?: { id: string; code: string; nameEn: string; nameAr: string } | null;
  shift?: { id: string; code: string; nameEn: string; nameAr: string } | null;
  group?: { id: string; code: string; nameEn: string; nameAr: string } | null;
}

export interface CreateUserPayload {
  nationalId: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  phone?: string | null;
  jobTitle?: string | null;
  roleId: string;
  departmentId?: string | null;
  shiftId?: string | null;
  groupId?: string | null;
  status?: UserStatus;
}

export type UpdateUserPayload = Partial<CreateUserPayload>;

export interface ListUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  roleId?: string;
  departmentId?: string;
  status?: UserStatus;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  status: ComplaintStatus;
  locationId: string | null;
  submitterId: string;
  reviewerId: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
  location?: { id: string; code: string; nameEn: string; nameAr: string } | null;
  submitter?: { id: string; fullName: string; employeeNumber: string } | null;
  reviewer?: { id: string; fullName: string; employeeNumber: string } | null;
}

export interface ListComplaintsParams {
  page?: number;
  pageSize?: number;
  status?: ComplaintStatus;
  search?: string;
  from?: string;
  to?: string;
}

export interface ComplaintStatistics {
  range: { from: string; to: string };
  total: number;
  byStatus: { status: ComplaintStatus; count: number }[];
  byDay: { day: string; count: number }[];
  repeatOffenders: {
    submitterId: string;
    count: number;
    submitter: { id: string; fullName: string; employeeNumber: string } | null;
  }[];
}

export interface DirectorDashboard {
  todaysViolations: number;
  openIncidents: number;
  todaysVisitors: number;
  openComplaints: number;
  totalComplaints: number;
  complaintsCount: number;
  averageResponseMs: number | null;
  averageResponseMinutes: number | null;
  onlineUsersEstimate: number;
  totalUsers: number;
  activeUsers: number;
  charts: {
    violationsByLocation: ChartPoint[];
    incidentsByType: ChartPoint[];
    visitorsByDay: VisitorsByDayPoint[];
    averageResponseTime: { milliseconds: number | null; minutes: number | null };
    sla: { onTime: number; breached: number; total: number };
  };
  recentComplaints: Complaint[];
  recentUsers: {
    id: string;
    fullName: string;
    employeeNumber: string;
    status: UserStatus;
    lastLoginAt: string | null;
    createdAt: string;
    role: { code: string; nameEn: string } | null;
  }[];
  lastSyncHint: string;
}

export interface ReportSummary {
  period: ReportPeriod;
  label: string;
  range: { from: string; to: string };
  violations: number;
  incidents: number;
  visitors: number;
  complaints: number;
  openIncidents: number;
  openComplaints: number;
  averageResponseMs: number | null;
  averageResponseMinutes: number | null;
}

export interface ViolationStatistics {
  range: { from: string; to: string };
  averageResponseTime: {
    milliseconds: number | null;
    seconds: number | null;
    minutes: number | null;
  };
  totalViolations: number;
  dailyViolations: { day: string; count: number }[];
  monthlyViolations: { month: string; count: number }[];
  violationsByLocation: {
    locationId: string;
    parkingCode: string;
    location: { id: string; code: string; nameEn: string; nameAr: string } | null;
    count: number;
  }[];
  violationsByUser: {
    userId: string;
    user: { id: string; fullName: string; employeeNumber: string } | null;
    count: number;
  }[];
}

export interface VisitorStatistics {
  range: { from: string; to: string };
  todaysVisitors: number;
  visitorsByDepartment: {
    departmentId: string | null;
    department: { id: string; code: string; nameEn: string; nameAr: string } | null;
    count: number;
  }[];
  visitorsByFloor: {
    floorId: string | null;
    floor: { id: string; code: string; nameEn: string; nameAr: string; level: number } | null;
    count: number;
  }[];
  visitorsByImportance: { importance: string; count: number }[];
  averageHostResponseTime: {
    milliseconds: number | null;
    seconds: number | null;
    minutes: number | null;
  };
}

export interface SystemSetting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Floor {
  id: string;
  buildingId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  level: number;
  createdAt: string;
  updatedAt: string;
  building?: { id: string; code: string; nameEn: string; nameAr: string };
  meetingRooms?: MeetingRoom[];
}

export interface MeetingRoom {
  id: string;
  floorId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  capacity: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  floor?: { id: string; code: string; nameEn: string; nameAr: string; level: number };
}

export interface IncidentType {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
