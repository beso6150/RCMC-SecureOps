import { SecurityReferralStatus } from '@prisma/client';
import { ForbiddenError, ValidationError } from '../../../shared/errors/index.js';
import { RoleCodes } from '../../identity/domain/roleCodes.js';

/** Allowed next statuses from each current status. */
export const REFERRAL_TRANSITIONS: Record<SecurityReferralStatus, SecurityReferralStatus[]> = {
  NEW: [SecurityReferralStatus.SENT, SecurityReferralStatus.CANCELLED],
  SENT: [
    SecurityReferralStatus.RECEIVED,
    SecurityReferralStatus.ESCALATED,
    SecurityReferralStatus.CANCELLED,
    SecurityReferralStatus.REJECTED,
  ],
  RECEIVED: [
    SecurityReferralStatus.IN_PROGRESS,
    SecurityReferralStatus.ESCALATED,
    SecurityReferralStatus.REJECTED,
  ],
  IN_PROGRESS: [
    SecurityReferralStatus.RESOLVED,
    SecurityReferralStatus.ESCALATED,
    SecurityReferralStatus.REJECTED,
  ],
  ESCALATED: [
    SecurityReferralStatus.SENT,
    SecurityReferralStatus.RECEIVED,
    SecurityReferralStatus.IN_PROGRESS,
    SecurityReferralStatus.RESOLVED,
    SecurityReferralStatus.CLOSED,
    SecurityReferralStatus.CANCELLED,
  ],
  RESOLVED: [SecurityReferralStatus.CLOSED, SecurityReferralStatus.IN_PROGRESS],
  CLOSED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function assertReferralTransition(
  current: SecurityReferralStatus,
  next: SecurityReferralStatus,
): void {
  if (!REFERRAL_TRANSITIONS[current]?.includes(next)) {
    throw new ValidationError(`لا يمكن الانتقال من حالة ${current} إلى ${next}`);
  }
}

export function assertCctvCannotClose(actorRoleCode: string): void {
  if (actorRoleCode === RoleCodes.CCTV_OPERATOR) {
    throw new ForbiddenError('مشغلة المراقبة لا تغلق المعالجة الميدانية');
  }
}

export function assertCctvCannotOverwriteResolution(actorRoleCode: string): void {
  if (actorRoleCode === RoleCodes.CCTV_OPERATOR) {
    throw new ForbiddenError('مشغلة المراقبة لا تعدّل نتيجة معالجة رجل الأمن');
  }
}

export function canCancelBeforeReceive(status: SecurityReferralStatus): boolean {
  return status === SecurityReferralStatus.NEW || status === SecurityReferralStatus.SENT;
}

export function assertPermitDateRange(validFrom: Date, validTo: Date, allowExpired = false): void {
  if (validFrom.getTime() >= validTo.getTime()) {
    throw new ValidationError('تاريخ البداية يجب أن يكون قبل تاريخ الانتهاء');
  }
  if (!allowExpired && validTo.getTime() < Date.now()) {
    throw new ValidationError('لا يمكن إنشاء تصريح منتهٍ إلا بصلاحية إدارية');
  }
}

export function isForbiddenExtension(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return ['exe', 'bat', 'cmd', 'ps1', 'js', 'mjs', 'html', 'htm', 'vbs', 'scr', 'com', 'msi'].includes(
    ext,
  );
}
