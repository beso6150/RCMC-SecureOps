import { prisma } from '../../../shared/database/prisma.js';

/** Generate next notification number: NTF-YYYY-###### */
export async function nextNotificationNumber(now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const prefix = `NTF-${year}-`;
  const latest = await prisma.notification.findFirst({
    where: { notificationNumber: { startsWith: prefix } },
    orderBy: { notificationNumber: 'desc' },
    select: { notificationNumber: true },
  });
  const last = latest?.notificationNumber
    ? Number(latest.notificationNumber.slice(prefix.length))
    : 0;
  const next = Number.isFinite(last) ? last + 1 : 1;
  return formatNotificationNumber(year, next);
}

export function formatNotificationNumber(year: number, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error('تسلسل رقم الإشعار غير صالح');
  }
  return `NTF-${year}-${String(sequence).padStart(6, '0')}`;
}
