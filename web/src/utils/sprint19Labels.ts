import type { NotificationCategory, NotificationPriority } from '../types/notifications';
import type { ConversationType } from '../types/communications';
import type { OperationalTaskType, TaskPriority, TaskStatus, TaskUpdateType } from '../types/tasks';

export const PRIORITY_LABELS: Record<NotificationPriority | TaskPriority, string> = {
  LOW: 'منخفض',
  NORMAL: 'عادي',
  HIGH: 'مرتفع',
  URGENT: 'عاجل',
  CRITICAL: 'حرج',
};

export const PRIORITY_COLORS: Record<
  NotificationPriority | TaskPriority,
  'default' | 'info' | 'warning' | 'error' | 'success'
> = {
  LOW: 'default',
  NORMAL: 'info',
  HIGH: 'warning',
  URGENT: 'error',
  CRITICAL: 'error',
};

export const NOTIFICATION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  SENT: 'مُرسل',
  DELIVERED: 'مُسلَّم',
  UNREAD: 'غير مقروء',
  READ: 'مقروء',
  ACKNOWLEDGED: 'تم التأكيد',
  EXPIRED: 'منتهٍ',
  FAILED: 'فشل',
  CANCELLED: 'ملغى',
};

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
  INCIDENT: 'حادث',
  EMERGENCY: 'طوارئ',
  CCTV_REFERRAL: 'إحالة مراقبة',
  PERMIT: 'تصريح',
  PATROL: 'جولة',
  CHECKPOINT: 'نقطة أمنية',
  FIELD_ALERT: 'تنبيه ميداني',
  SOS: 'نجدة',
  VEHICLE_VIOLATION: 'مخالفة مركبة',
  VISITOR: 'زائر',
  SHIFT: 'وردية',
  HANDOVER: 'تسليم وردية',
  TASK: 'مهمة',
  REPORT: 'تقرير',
  APPROVAL: 'اعتماد',
  SECURITY: 'أمني',
  SYSTEM: 'نظام',
  MESSAGE: 'رسالة',
};

export const NOTIFICATION_KIND_LABELS: Record<string, string> = {
  INFORMATIONAL: 'معلوماتي',
  ACTION_REQUIRED: 'يحتاج إجراء',
  ACKNOWLEDGEMENT_REQUIRED: 'يحتاج تأكيدًا',
  URGENT: 'عاجل',
  CRITICAL: 'حرج',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  NEW: 'جديدة',
  PENDING: 'قيد الانتظار',
  ASSIGNED: 'مسندة',
  ACCEPTED: 'مقبولة',
  IN_PROGRESS: 'قيد التنفيذ',
  WAITING: 'بانتظار',
  COMPLETED: 'مكتملة',
  REJECTED: 'مرفوضة',
  CANCELLED: 'ملغاة',
  OVERDUE: 'متأخرة',
};

export const TASK_TYPE_LABELS: Record<OperationalTaskType, string> = {
  SECURITY_RESPONSE: 'استجابة أمنية',
  PATROL: 'جولة أمنية',
  CHECKPOINT: 'نقطة أمنية',
  INCIDENT_FOLLOW_UP: 'متابعة حادث',
  CCTV_FOLLOW_UP: 'متابعة مراقبة',
  PERMIT_VERIFICATION: 'التحقق من تصريح',
  VISITOR_ASSISTANCE: 'مساعدة زائر',
  VEHICLE_CHECK: 'فحص مركبة',
  HANDOVER: 'تسليم وردية',
  REPORT_REVIEW: 'مراجعة تقرير',
  GENERAL: 'عامة',
};

export const TASK_UPDATE_LABELS: Record<TaskUpdateType, string> = {
  CREATED: 'إنشاء',
  ASSIGNED: 'إسناد',
  ACCEPTED: 'قبول',
  STARTED: 'بدء',
  NOTE_ADDED: 'ملاحظة',
  EVIDENCE_ADDED: 'دليل',
  WAITING: 'انتظار',
  COMPLETED: 'إكمال',
  REJECTED: 'رفض',
  REASSIGNED: 'إعادة إسناد',
  CANCELLED: 'إلغاء',
  OVERDUE: 'تأخر',
};

export const CONVERSATION_TYPE_LABELS: Record<ConversationType, string> = {
  DIRECT: 'مباشرة',
  GROUP: 'مجموعة',
  INCIDENT: 'حادث',
  REFERRAL: 'إحالة',
  SHIFT: 'وردية',
  OPERATIONS: 'عمليات',
  TASK: 'مهمة',
};

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('ar-SA', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const base64 = result.includes(',') ? result.split(',')[1]! : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error('تعذّر قراءة الملف'));
    reader.readAsDataURL(file);
  });
}
