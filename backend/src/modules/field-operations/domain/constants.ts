import {
  FieldAlertSeverity,
  FieldAlertStatus,
  FieldAlertType,
  OperationalStatus,
  PatrolSessionStatus,
} from '@prisma/client';

/** Busy / unavailable for nearest-personnel suggestions. */
export const BUSY_OPERATIONAL_STATUSES: OperationalStatus[] = [
  OperationalStatus.OFF_DUTY,
  OperationalStatus.ON_BREAK,
  OperationalStatus.HANDLING_INCIDENT,
];

/** Available for nearest-personnel suggestions. */
export const AVAILABLE_OPERATIONAL_STATUSES: OperationalStatus[] = [
  OperationalStatus.ON_DUTY,
  OperationalStatus.ON_PATROL,
  OperationalStatus.FIELD_TASK,
  OperationalStatus.WITH_CCTV,
];

export const PATROL_SESSION_STATUS_LABELS: Record<
  PatrolSessionStatus,
  { nameAr: string; nameEn: string }
> = {
  SCHEDULED: { nameAr: 'مجدولة', nameEn: 'Scheduled' },
  ASSIGNED: { nameAr: 'مُسندة', nameEn: 'Assigned' },
  IN_PROGRESS: { nameAr: 'جارية', nameEn: 'In Progress' },
  COMPLETED: { nameAr: 'مكتملة', nameEn: 'Completed' },
  LATE: { nameAr: 'متأخرة', nameEn: 'Late' },
  MISSED: { nameAr: 'فائتة', nameEn: 'Missed' },
  CANCELLED: { nameAr: 'ملغاة', nameEn: 'Cancelled' },
};

export const FIELD_ALERT_TYPE_LABELS: Record<FieldAlertType, { nameAr: string; nameEn: string }> = {
  SOS: { nameAr: 'نداء استغاثة', nameEn: 'SOS' },
  PATROL_DELAY: { nameAr: 'تأخير جولة', nameEn: 'Patrol Delay' },
  CHECKPOINT_MISSED: { nameAr: 'نقطة تفتيش فائتة', nameEn: 'Checkpoint Missed' },
  RESTRICTED_AREA: { nameAr: 'منطقة محظورة', nameEn: 'Restricted Area' },
  OFFLINE_USER: { nameAr: 'مستخدم غير متصل', nameEn: 'Offline User' },
  INCIDENT_NEARBY: { nameAr: 'بلاغ قريب', nameEn: 'Incident Nearby' },
  SECURITY_NOTICE: { nameAr: 'إشعار أمني', nameEn: 'Security Notice' },
  OTHER: { nameAr: 'أخرى', nameEn: 'Other' },
};

export const FIELD_ALERT_SEVERITY_LABELS: Record<
  FieldAlertSeverity,
  { nameAr: string; nameEn: string }
> = {
  LOW: { nameAr: 'منخفضة', nameEn: 'Low' },
  MEDIUM: { nameAr: 'متوسطة', nameEn: 'Medium' },
  HIGH: { nameAr: 'عالية', nameEn: 'High' },
  CRITICAL: { nameAr: 'حرجة', nameEn: 'Critical' },
};

export const FIELD_ALERT_STATUS_LABELS: Record<
  FieldAlertStatus,
  { nameAr: string; nameEn: string }
> = {
  NEW: { nameAr: 'جديدة', nameEn: 'New' },
  ACKNOWLEDGED: { nameAr: 'مُقرّ بها', nameEn: 'Acknowledged' },
  IN_PROGRESS: { nameAr: 'قيد المعالجة', nameEn: 'In Progress' },
  RESOLVED: { nameAr: 'محلولة', nameEn: 'Resolved' },
  CANCELLED: { nameAr: 'ملغاة', nameEn: 'Cancelled' },
};

export const ACTIVE_PATROL_STATUSES: PatrolSessionStatus[] = [
  PatrolSessionStatus.SCHEDULED,
  PatrolSessionStatus.ASSIGNED,
  PatrolSessionStatus.IN_PROGRESS,
  PatrolSessionStatus.LATE,
];

export const TERMINAL_PATROL_STATUSES: PatrolSessionStatus[] = [
  PatrolSessionStatus.COMPLETED,
  PatrolSessionStatus.CANCELLED,
  PatrolSessionStatus.MISSED,
];
