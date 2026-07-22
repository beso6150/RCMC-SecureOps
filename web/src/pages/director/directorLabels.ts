import type { ComplaintStatus, UserStatus, ViolationType } from '../../types/director';

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'نشط',
  INACTIVE: 'غير نشط',
  SUSPENDED: 'موقوف',
  PENDING_FIRST_LOGIN: 'بانتظار أول دخول',
};

export const COMPLAINT_STATUS_LABELS: Record<ComplaintStatus, string> = {
  SUBMITTED: 'مقدّمة',
  UNDER_REVIEW: 'قيد المراجعة',
  APPROVED: 'مقبولة',
  REJECTED: 'مرفوضة',
  CLOSED: 'مغلقة',
};

export const COMPLAINT_STATUS_COLORS: Record<ComplaintStatus, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
  SUBMITTED: 'info',
  UNDER_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  CLOSED: 'default',
};

export const VIOLATION_TYPE_LABELS: Record<ViolationType, string> = {
  ILLEGAL_PARKING: 'وقوف غير قانوني',
  NO_PERMIT: 'بدون تصريح',
  EXPIRED_PERMIT: 'تصريح منتهٍ',
  BLOCKING: 'حجب مسار',
  UNAUTHORIZED_ZONE: 'منطقة غير مصرّح بها',
  OTHER: 'أخرى',
};

export const PERIOD_LABELS = {
  daily: 'يومي',
  weekly: 'أسبوعي',
  monthly: 'شهري',
  yearly: 'سنوي',
} as const;

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('ar-SA', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
