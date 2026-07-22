export type AuditAction =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'FAILED_LOGIN'
  | 'PASSWORD_CHANGE'
  | 'PERMISSION_CHANGE'
  | 'APPROVE'
  | 'REJECT'
  | 'ASSIGN'
  | 'EXPORT'
  | 'SYSTEM'
  | 'DOWNLOAD'
  | 'PRINT'
  | 'VIEW_SENSITIVE'
  | 'ACCESS_DENIED';

export type AuditSeverity = 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';

export interface AuditActorBrief {
  id: string;
  fullName: string;
  employeeNumber: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  module: string | null;
  description: string | null;
  oldValues: unknown;
  newValues: unknown;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  severity: AuditSeverity;
  success: boolean;
  failureReason: string | null;
  createdAt: string;
  actor?: AuditActorBrief | null;
}

export interface AuditLogsListParams {
  page?: number;
  pageSize?: number;
  actorId?: string;
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  module?: string;
  severity?: AuditSeverity;
  success?: boolean;
  requestId?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface PaginatedAuditLogs {
  data: AuditLogEntry[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditLogStatistics {
  total: number;
  failed: number;
  successRate: number;
  byAction: Array<{ action: AuditAction | string; count: number }>;
  bySeverity: Array<{ severity: AuditSeverity | string; count: number }>;
  byModule: Array<{ module: string | null; count: number }>;
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'إنشاء',
  READ: 'قراءة',
  UPDATE: 'تحديث',
  DELETE: 'حذف',
  LOGIN: 'تسجيل دخول',
  LOGOUT: 'تسجيل خروج',
  FAILED_LOGIN: 'فشل تسجيل الدخول',
  PASSWORD_CHANGE: 'تغيير كلمة المرور',
  PERMISSION_CHANGE: 'تغيير صلاحيات',
  APPROVE: 'اعتماد',
  REJECT: 'رفض',
  ASSIGN: 'إسناد',
  EXPORT: 'تصدير',
  SYSTEM: 'نظام',
  DOWNLOAD: 'تنزيل',
  PRINT: 'طباعة',
  VIEW_SENSITIVE: 'عرض بيانات حساسة',
  ACCESS_DENIED: 'رفض وصول',
};

export const AUDIT_SEVERITY_LABELS: Record<AuditSeverity, string> = {
  INFO: 'معلومات',
  WARNING: 'تحذير',
  HIGH: 'مرتفع',
  CRITICAL: 'حرج',
};
