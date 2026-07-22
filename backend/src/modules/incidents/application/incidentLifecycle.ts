import {
  IncidentSeverity,
  IncidentStatus,
} from '@prisma/client';
import { ConflictError, ForbiddenError, ValidationError } from '../../../shared/errors/index.js';
import { RoleCodes } from '../../identity/domain/roleCodes.js';
import {
  INCIDENT_STATUS_TRANSITIONS,
  INCIDENT_TERMINAL_STATUSES,
} from '../domain/constants.js';

export function assertIncidentTransition(from: IncidentStatus, to: IncidentStatus): void {
  const allowed = INCIDENT_STATUS_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new ConflictError(`لا يمكن الانتقال من ${from} إلى ${to}`);
  }
}

export function isTerminalIncidentStatus(status: IncidentStatus): boolean {
  return INCIDENT_TERMINAL_STATUSES.includes(status);
}

export function assertNotTerminal(status: IncidentStatus, actionLabel = 'تعديل البلاغ'): void {
  if (isTerminalIncidentStatus(status)) {
    throw new ConflictError(`لا يمكن ${actionLabel} لبلاغ مغلق أو ملغى`);
  }
}

/**
 * Guards may resolve LOW/MEDIUM but cannot close HIGH/CRITICAL.
 * Supervisors+ may close any severity when transition allows.
 */
export function assertCanCloseIncident(params: {
  roleCode: string;
  severity: IncidentSeverity;
  fromStatus: IncidentStatus;
}): void {
  assertIncidentTransition(params.fromStatus, IncidentStatus.CLOSED);

  if (params.roleCode === RoleCodes.SECURITY_GUARD) {
    if (
      params.severity === IncidentSeverity.HIGH ||
      params.severity === IncidentSeverity.CRITICAL
    ) {
      throw new ForbiddenError(
        'لا يمكن للحارس إغلاق بلاغ عالي أو حرج — يلزم مشرف أو مدير عمليات',
      );
    }
  }

  if (params.roleCode === RoleCodes.CCTV_OPERATOR) {
    throw new ForbiddenError('مشغلة المراقبة لا تغلق البلاغات');
  }
}

export function assertFalseAlarmReason(reason: string | null | undefined): string {
  const trimmed = reason?.trim() ?? '';
  if (!trimmed) {
    throw new ValidationError('سبب الإنذار الكاذب مطلوب');
  }
  return trimmed;
}

export function assertCanResolveAsGuard(params: {
  roleCode: string;
  severity: IncidentSeverity;
}): void {
  if (params.roleCode !== RoleCodes.SECURITY_GUARD) return;
  if (
    params.severity === IncidentSeverity.HIGH ||
    params.severity === IncidentSeverity.CRITICAL
  ) {
    // Resolve is allowed for field work; closing HIGH/CRITICAL is blocked separately.
    return;
  }
}

export function mapRoleToIncidentSource(roleCode: string): string {
  switch (roleCode) {
    case RoleCodes.SECURITY_GUARD:
      return 'SECURITY_GUARD';
    case RoleCodes.SECURITY_SUPERVISOR:
      return 'SUPERVISOR';
    case RoleCodes.CCTV_OPERATOR:
      return 'CCTV_OPERATOR';
    case RoleCodes.OPERATIONS_MANAGER:
      return 'OPERATIONS_ROOM';
    case RoleCodes.SECURITY_DIRECTOR:
      return 'OPERATIONS_ROOM';
    default:
      return 'OTHER';
  }
}
