import { NotificationPriority } from '@prisma/client';

const DEFAULT_TZ = 'Asia/Riyadh';

/** Parse "HH:mm" or "HH:mm:ss" into minutes from midnight. */
export function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Local wall-clock minutes in a timezone (default Asia/Riyadh). */
export function localMinutesOfDay(now: Date, timeZone = DEFAULT_TZ): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

/**
 * Quiet hours with midnight wrap support.
 * Example: from 22:00 to 06:00 → quiet overnight.
 */
export function isWithinQuietHours(
  now: Date,
  from: string | null | undefined,
  to: string | null | undefined,
  timeZone = DEFAULT_TZ,
): boolean {
  if (!from || !to) return false;
  const fromMin = parseTimeToMinutes(from);
  const toMin = parseTimeToMinutes(to);
  if (fromMin === null || toMin === null) return false;
  if (fromMin === toMin) return false;

  const current = localMinutesOfDay(now, timeZone);

  if (fromMin < toMin) {
    return current >= fromMin && current < toMin;
  }
  // Midnight wrap: e.g. 22:00 → 06:00
  return current >= fromMin || current < toMin;
}

/** CRITICAL / URGENT always bypass quiet hours. */
export function shouldBypassQuietHours(priority: NotificationPriority): boolean {
  return (
    priority === NotificationPriority.CRITICAL || priority === NotificationPriority.URGENT
  );
}

export function isDeliveryBlockedByQuietHours(input: {
  now?: Date;
  quietHoursEnabled: boolean;
  quietHoursFrom?: string | null;
  quietHoursTo?: string | null;
  priority: NotificationPriority;
  timeZone?: string;
}): boolean {
  if (!input.quietHoursEnabled) return false;
  if (shouldBypassQuietHours(input.priority)) return false;
  return isWithinQuietHours(
    input.now ?? new Date(),
    input.quietHoursFrom,
    input.quietHoursTo,
    input.timeZone ?? DEFAULT_TZ,
  );
}
