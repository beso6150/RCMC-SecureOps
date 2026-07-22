import { OperationalStatus, ShiftKind, ShiftSessionStatus } from '@prisma/client';

export const SHIFT_KIND_LABELS: Record<ShiftKind, { nameAr: string; nameEn: string }> = {
  MORNING: { nameAr: 'وردية صباحية', nameEn: 'Morning Shift' },
  EVENING: { nameAr: 'وردية مسائية', nameEn: 'Evening Shift' },
};

export const SHIFT_GROUP_LABELS: Record<string, { nameAr: string; nameEn: string }> = {
  A: { nameAr: 'المجموعة أ', nameEn: 'Group A' },
  B: { nameAr: 'المجموعة ب', nameEn: 'Group B' },
  C: { nameAr: 'المجموعة ج', nameEn: 'Group C' },
  D: { nameAr: 'المجموعة د', nameEn: 'Group D' },
};

export const OPERATIONAL_STATUS_LABELS: Record<
  OperationalStatus,
  { nameAr: string; nameEn: string; emoji: string }
> = {
  ON_DUTY: { nameAr: 'في الخدمة', nameEn: 'On Duty', emoji: '🟢' },
  ON_PATROL: { nameAr: 'يقوم بجولة', nameEn: 'On Patrol', emoji: '🚶' },
  HANDLING_INCIDENT: { nameAr: 'مباشر بلاغ', nameEn: 'Handling Incident', emoji: '🚨' },
  FIELD_TASK: { nameAr: 'مهمة ميدانية', nameEn: 'Field Task', emoji: '📍' },
  WITH_CCTV: { nameAr: 'يعمل مع غرفة المراقبة', nameEn: 'With CCTV', emoji: '📷' },
  ON_BREAK: { nameAr: 'استراحة', nameEn: 'On Break', emoji: '☕' },
  OFF_DUTY: { nameAr: 'خارج الخدمة', nameEn: 'Off Duty', emoji: '❌' },
};

export const SESSION_STATUS_LABELS: Record<
  ShiftSessionStatus,
  { nameAr: string; nameEn: string }
> = {
  OPEN: { nameAr: 'مفتوحة', nameEn: 'Open' },
  HANDOVER_PENDING: { nameAr: 'بانتظار التسليم', nameEn: 'Handover Pending' },
  CLOSED: { nameAr: 'مغلقة', nameEn: 'Closed' },
};

export const ON_DUTY_OPERATIONAL_STATUSES: OperationalStatus[] = [
  OperationalStatus.ON_DUTY,
  OperationalStatus.ON_PATROL,
  OperationalStatus.HANDLING_INCIDENT,
  OperationalStatus.FIELD_TASK,
  OperationalStatus.WITH_CCTV,
  OperationalStatus.ON_BREAK,
];

export const SHIFT_ENDING_ALERT_KEY = 'shift_ending_30m';
export const SHIFT_ENDING_ALERT_MS = 30 * 60 * 1000;

export const SHIFT_GROUP_SEED = [
  { code: 'A' as const, nameAr: 'المجموعة أ', nameEn: 'Group A' },
  { code: 'B' as const, nameAr: 'المجموعة ب', nameEn: 'Group B' },
  { code: 'C' as const, nameAr: 'المجموعة ج', nameEn: 'Group C' },
  { code: 'D' as const, nameAr: 'المجموعة د', nameEn: 'Group D' },
];
