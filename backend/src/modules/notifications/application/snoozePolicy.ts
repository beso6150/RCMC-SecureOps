import { NotificationCategory, NotificationPriority } from '@prisma/client';
import { ValidationError } from '../../../shared/errors/index.js';

/** CRITICAL priority and SOS category cannot be snoozed or bulk-acked away. */
export function isSnoozeForbidden(input: {
  priority?: NotificationPriority | null;
  category?: NotificationCategory | null;
}): boolean {
  if (input.priority === NotificationPriority.CRITICAL) return true;
  if (input.category === NotificationCategory.SOS) return true;
  return false;
}

export function assertCanSnooze(input: {
  priority?: NotificationPriority | null;
  category?: NotificationCategory | null;
}): void {
  if (isSnoozeForbidden(input)) {
    throw new ValidationError('لا يمكن تأجيل إشعارات الطوارئ أو طلبات النجدة');
  }
}

/** Resolve snooze-until from absolute ISO date or relative minutes. */
export function resolveSnoozeUntil(input: {
  until?: Date | string | null;
  minutes?: number | null;
  now?: Date;
}): Date {
  const now = input.now ?? new Date();

  if (input.until != null) {
    const until = input.until instanceof Date ? input.until : new Date(input.until);
    if (Number.isNaN(until.getTime())) {
      throw new ValidationError('تاريخ التأجيل غير صالح');
    }
    if (until.getTime() <= now.getTime()) {
      throw new ValidationError('يجب أن يكون وقت التأجيل في المستقبل');
    }
    return until;
  }

  if (input.minutes != null) {
    if (!Number.isFinite(input.minutes) || input.minutes < 1) {
      throw new ValidationError('مدة التأجيل بالدقائق غير صالحة');
    }
    return new Date(now.getTime() + input.minutes * 60_000);
  }

  throw new ValidationError('يجب تحديد until أو minutes للتأجيل');
}

/** Notifications eligible for acknowledge-all-allowed (non-CRITICAL, non-SOS). */
export function isEligibleForBulkAcknowledge(input: {
  priority?: NotificationPriority | null;
  category?: NotificationCategory | null;
  requiresAcknowledgement?: boolean;
  acknowledgedAt?: Date | null;
}): boolean {
  if (!input.requiresAcknowledgement) return false;
  if (input.acknowledgedAt) return false;
  if (isSnoozeForbidden(input)) return false;
  return true;
}
