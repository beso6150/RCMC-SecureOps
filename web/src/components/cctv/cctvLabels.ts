export const VIOLATION_STATUS_LABELS: Record<string, string> = {
  NEW: 'جديد',
  ASSIGNED: 'مُسند',
  IN_PROGRESS: 'قيد المعالجة',
  RESOLVED: 'مُغلق',
  CANCELLED: 'ملغى',
};

export const INCIDENT_STATUS_LABELS: Record<string, string> = {
  NEW: 'جديد',
  ASSIGNED: 'مُسند',
  IN_PROGRESS: 'قيد المعالجة',
  ON_HOLD: 'معلّق',
  CLOSED: 'مُغلق',
  CANCELLED: 'ملغى',
};

export const CAMERA_REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING: 'معلّق',
  IN_PROGRESS: 'قيد التنفيذ',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغى',
};

export const VISIT_STATUS_LABELS: Record<string, string> = {
  UPCOMING: 'قادم',
  ARRIVED: 'وصل',
  HOST_NOTIFIED: 'تم إبلاغ المضيف',
  IN_MEETING: 'في الاجتماع',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغى',
};

export const SEVERITY_LABELS: Record<string, string> = {
  LOW: 'منخفض',
  MEDIUM: 'متوسط',
  HIGH: 'مرتفع',
  CRITICAL: 'حرج',
};

export const VIOLATION_TYPE_LABELS: Record<string, string> = {
  ILLEGAL_PARKING: 'وقوف غير نظامي',
  NO_PERMIT: 'بدون تصريح',
  EXPIRED_PERMIT: 'تصريح منتهي',
  BLOCKING: 'إعاقة',
  UNAUTHORIZED_ZONE: 'منطقة غير مصرّحة',
  OTHER: 'أخرى',
};

export const PARKING_LABELS: Record<string, string> = {
  GROUND_PARKING: 'موقف الأرضي',
  BASEMENT_PARKING: 'موقف السرداب',
  WEST_PARKING: 'موقف الغرب',
};

export const TIMELINE_TYPE_LABELS: Record<string, string> = {
  incident: 'بلاغ',
  violation: 'مخالفة',
  camera_request: 'طلب كاميرا',
  visitor: 'زائر',
};

export function formatElapsedArabic(from: string | Date, now = Date.now()): string {
  const start = typeof from === 'string' ? new Date(from).getTime() : from.getTime();
  const diffMs = Math.max(0, now - start);
  const seconds = Math.floor(diffMs / 1000);

  if (seconds < 60) return `منذ ${seconds} ث`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `منذ ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} ي`;
}

export function formatResponseMs(ms: number | null | undefined): string {
  if (ms == null) return '—';
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} د`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours} س ${rem} د` : `${hours} س`;
}

export const OPEN_INCIDENT_STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'] as const;
export const OPEN_VIOLATION_STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS'] as const;
export const CURRENT_VISITOR_STATUSES = ['ARRIVED', 'HOST_NOTIFIED', 'IN_MEETING'] as const;
