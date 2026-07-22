import { MobileSyncStatus } from '@prisma/client';
import { AppError, ConflictError, ForbiddenError, ValidationError } from '../../../shared/errors/index.js';
import { PermissionCodes, type PermissionCode } from '../../identity/domain/permissionCodes.js';
import { parseCachedResponse } from '../../../shared/middleware/idempotency.js';

export type MobileOperationType =
  | 'TASK_ACCEPT'
  | 'TASK_START'
  | 'TASK_WAIT'
  | 'TASK_COMPLETE'
  | 'TASK_REJECT'
  | 'INCIDENT_ACK'
  | 'INCIDENT_ARRIVE'
  | 'INCIDENT_NOTE'
  | 'REFERRAL_RECEIVE'
  | 'REFERRAL_START'
  | 'REFERRAL_ARRIVE'
  | 'PERMIT_ACKNOWLEDGE'
  | 'CHECKPOINT_VISIT'
  | 'VIOLATION_CREATE'
  | 'MESSAGE_SEND'
  | 'SOS_CREATE';

/** Maps offline op types to mobile RBAC permission codes. */
export const OPERATION_PERMISSION_MAP: Record<MobileOperationType, PermissionCode> = {
  TASK_ACCEPT: PermissionCodes.MOBILE_TASKS_UPDATE,
  TASK_START: PermissionCodes.MOBILE_TASKS_UPDATE,
  TASK_WAIT: PermissionCodes.MOBILE_TASKS_UPDATE,
  TASK_COMPLETE: PermissionCodes.MOBILE_TASKS_UPDATE,
  TASK_REJECT: PermissionCodes.MOBILE_TASKS_UPDATE,
  INCIDENT_ACK: PermissionCodes.MOBILE_INCIDENTS_RESPOND,
  INCIDENT_ARRIVE: PermissionCodes.MOBILE_INCIDENTS_RESPOND,
  INCIDENT_NOTE: PermissionCodes.MOBILE_INCIDENTS_RESPOND,
  REFERRAL_RECEIVE: PermissionCodes.MOBILE_REFERRALS_RESPOND,
  REFERRAL_START: PermissionCodes.MOBILE_REFERRALS_RESPOND,
  REFERRAL_ARRIVE: PermissionCodes.MOBILE_REFERRALS_RESPOND,
  PERMIT_ACKNOWLEDGE: PermissionCodes.MOBILE_PERMITS_ACKNOWLEDGE,
  CHECKPOINT_VISIT: PermissionCodes.MOBILE_CHECKPOINTS_SCAN,
  VIOLATION_CREATE: PermissionCodes.MOBILE_VIOLATIONS_CREATE,
  MESSAGE_SEND: PermissionCodes.MOBILE_COMMUNICATIONS_SEND,
  SOS_CREATE: PermissionCodes.MOBILE_SOS_CREATE,
};

export function deviceUniquenessKey(userId: string, deviceUuid: string): string {
  return `${userId}::${deviceUuid.trim()}`;
}

export function parseOfflineAllowlist(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  }
  if (typeof value === 'string') {
    try {
      return parseOfflineAllowlist(JSON.parse(value));
    } catch {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function canBootstrap(permissions: string[]): boolean {
  return (
    permissions.includes(PermissionCodes.MOBILE_BOOTSTRAP) ||
    permissions.includes(PermissionCodes.MOBILE_APP_ACCESS)
  );
}

export function assertBatchPermission(
  permissions: string[],
  operationType: string,
): { allowed: true } | { allowed: false; reason: string } {
  if (!permissions.includes(PermissionCodes.MOBILE_OFFLINE_OPERATIONS)) {
    return { allowed: false, reason: 'لا تملك صلاحية العمليات دون اتصال' };
  }
  const required = OPERATION_PERMISSION_MAP[operationType as MobileOperationType];
  if (!required) {
    return { allowed: false, reason: `نوع العملية غير معروف: ${operationType}` };
  }
  if (!permissions.includes(required)) {
    return { allowed: false, reason: `صلاحية مرفوضة لهذه العملية: ${operationType}` };
  }
  return { allowed: true };
}

export function mapErrorToSyncStatus(err: unknown): {
  status: Extract<MobileSyncStatus, 'CONFLICT' | 'REJECTED' | 'FAILED'>;
  reason: string;
} {
  if (err instanceof ForbiddenError) {
    return { status: MobileSyncStatus.REJECTED, reason: err.message || 'صلاحية مرفوضة' };
  }
  if (err instanceof ConflictError) {
    return { status: MobileSyncStatus.CONFLICT, reason: err.message || 'تعارض في الحالة' };
  }
  if (err instanceof ValidationError) {
    const msg = err.message || 'عملية غير صالحة';
    // Invalid lifecycle / وردية transitions → CONFLICT
    if (
      /انتقال|حالة|غير مسموح|لا يمكن|وردية|transition/i.test(msg) ||
      err.statusCode === 409
    ) {
      return { status: MobileSyncStatus.CONFLICT, reason: msg };
    }
    return { status: MobileSyncStatus.CONFLICT, reason: msg };
  }
  if (err instanceof AppError && err.statusCode === 409) {
    return { status: MobileSyncStatus.CONFLICT, reason: err.message };
  }
  if (err instanceof AppError && err.statusCode === 403) {
    return { status: MobileSyncStatus.REJECTED, reason: err.message };
  }
  const message = err instanceof Error ? err.message : 'فشل تنفيذ العملية';
  return { status: MobileSyncStatus.FAILED, reason: message };
}

export function buildIdempotencyReplay(record: {
  status: MobileSyncStatus;
  responseSummaryJson: string | null;
  serverEntityId?: string | null;
  failureReason?: string | null;
  idempotencyKey: string;
  operationType: string;
}): {
  replayed: true;
  status: MobileSyncStatus;
  idempotencyKey: string;
  operationType: string;
  serverEntityId: string | null;
  summary: unknown;
  failureReason: string | null;
} | null {
  if (record.status !== MobileSyncStatus.COMPLETED) return null;
  return {
    replayed: true,
    status: record.status,
    idempotencyKey: record.idempotencyKey,
    operationType: record.operationType,
    serverEntityId: record.serverEntityId ?? null,
    summary: parseCachedResponse(record.responseSummaryJson),
    failureReason: record.failureReason ?? null,
  };
}

export function extractServerEntityId(result: unknown): string | null {
  if (!result || typeof result !== 'object') return null;
  const obj = result as Record<string, unknown>;
  if (typeof obj.id === 'string') return obj.id;
  if (obj.data && typeof obj.data === 'object' && obj.data !== null) {
    const id = (obj.data as { id?: unknown }).id;
    if (typeof id === 'string') return id;
  }
  return null;
}
