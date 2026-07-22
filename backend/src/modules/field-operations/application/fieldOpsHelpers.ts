import { OperationalStatus, PatrolSessionStatus } from '@prisma/client';
import { ForbiddenError, ValidationError } from '../../../shared/errors/index.js';
import { RoleCodes } from '../../identity/domain/roleCodes.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { AuthenticatedUser } from '../../identity/domain/types.js';
import { TERMINAL_PATROL_STATUSES } from '../domain/constants.js';

export interface RestingAssignInput {
  assigneeGroupId: string | null | undefined;
  isGroupResting: boolean;
  actorRoleCode: string;
  overrideReason?: string | null;
}

export interface RestingAssignResult {
  allowed: boolean;
  overrideRestingGroup: boolean;
  overrideReason: string | null;
}

/**
 * Block assigning patrols to resting-group personnel unless Security Director
 * provides an overrideReason (audited by caller).
 */
export function assertRestingGroupAssign(input: RestingAssignInput): RestingAssignResult {
  if (!input.isGroupResting) {
    return { allowed: true, overrideRestingGroup: false, overrideReason: null };
  }

  if (input.actorRoleCode !== RoleCodes.SECURITY_DIRECTOR) {
    throw new ForbiddenError(
      'لا يمكن إسناد جولة لموظف في مجموعة الراحة إلا بواسطة المدير الأمني مع سبب التجاوز',
    );
  }

  const reason = input.overrideReason?.trim();
  if (!reason) {
    throw new ValidationError('سبب تجاوز مجموعة الراحة مطلوب (overrideReason)');
  }

  return { allowed: true, overrideRestingGroup: true, overrideReason: reason };
}

export function isPatrolLate(params: {
  startedAt: Date | null | undefined;
  scheduledStartAt: Date;
  estimatedDurationMinutes: number;
  now?: Date;
  status?: PatrolSessionStatus;
}): boolean {
  if (params.status && TERMINAL_PATROL_STATUSES.includes(params.status)) {
    return false;
  }
  const now = params.now ?? new Date();
  const start = params.startedAt ?? params.scheduledStartAt;
  const dueAt = new Date(start.getTime() + params.estimatedDurationMinutes * 60_000);
  return now.getTime() > dueAt.getTime();
}

export function missedRequiredCheckpoints(params: {
  requiredCheckpointIds: string[];
  visitedCheckpointIds: string[];
}): string[] {
  const visited = new Set(params.visitedCheckpointIds);
  return params.requiredCheckpointIds.filter((id) => !visited.has(id));
}

export function canUpdatePersonnelLocation(
  actor: AuthenticatedUser,
  targetUserId: string,
): { allowed: boolean; mode: 'self' | 'any' | 'denied' } {
  if (actor.id === targetUserId) {
    const selfOk =
      actor.permissions.includes(PermissionCodes.PERSONNEL_LOCATIONS_UPDATE_SELF) ||
      actor.permissions.includes(PermissionCodes.PERSONNEL_LOCATIONS_UPDATE_ANY);
    return selfOk
      ? { allowed: true, mode: 'self' }
      : { allowed: false, mode: 'denied' };
  }

  if (actor.permissions.includes(PermissionCodes.PERSONNEL_LOCATIONS_UPDATE_ANY)) {
    return { allowed: true, mode: 'any' };
  }

  return { allowed: false, mode: 'denied' };
}

export function assertCanUpdatePersonnelLocation(
  actor: AuthenticatedUser,
  targetUserId: string,
): 'self' | 'any' {
  const result = canUpdatePersonnelLocation(actor, targetUserId);
  if (result.mode === 'self' || result.mode === 'any') {
    return result.mode;
  }
  throw new ForbiddenError('لا تملك صلاحية تحديث موقع هذا المستخدم');
}

/** In-memory rate limiter keyed by userId. */
export class InMemoryRateLimiter {
  private readonly hits = new Map<string, number>();

  constructor(private windowMs: number) {}

  setWindowMs(windowMs: number): void {
    this.windowMs = windowMs;
  }

  /**
   * @returns true if the action is allowed, false if throttled.
   */
  tryAcquire(key: string, now: Date = new Date(), windowMs?: number): boolean {
    const window = windowMs ?? this.windowMs;
    const last = this.hits.get(key);
    const t = now.getTime();
    if (last !== undefined && t - last < window) {
      return false;
    }
    this.hits.set(key, t);
    return true;
  }

  reset(key?: string): void {
    if (key) this.hits.delete(key);
    else this.hits.clear();
  }
}

export function buildSosAlertPayload(input: {
  actorId: string;
  actorName: string;
  description?: string | null;
  zoneId?: string | null;
  mapX?: number | null;
  mapY?: number | null;
}) {
  return {
    title: `نداء استغاثة — ${input.actorName}`,
    description:
      input.description?.trim() ||
      `تم إرسال نداء استغاثة من ${input.actorName}`,
    alertType: 'SOS' as const,
    severity: 'CRITICAL' as const,
    zoneId: input.zoneId ?? null,
    mapX: input.mapX ?? null,
    mapY: input.mapY ?? null,
    createdById: input.actorId,
    assignedUserId: input.actorId,
  };
}

export function assertPatrolTransition(
  current: PatrolSessionStatus,
  next: PatrolSessionStatus,
): void {
  const allowed: Record<PatrolSessionStatus, PatrolSessionStatus[]> = {
    SCHEDULED: [
      PatrolSessionStatus.ASSIGNED,
      PatrolSessionStatus.IN_PROGRESS,
      PatrolSessionStatus.CANCELLED,
    ],
    ASSIGNED: [
      PatrolSessionStatus.IN_PROGRESS,
      PatrolSessionStatus.CANCELLED,
      PatrolSessionStatus.ASSIGNED,
    ],
    IN_PROGRESS: [
      PatrolSessionStatus.COMPLETED,
      PatrolSessionStatus.LATE,
      PatrolSessionStatus.CANCELLED,
    ],
    LATE: [PatrolSessionStatus.COMPLETED, PatrolSessionStatus.CANCELLED],
    COMPLETED: [],
    MISSED: [],
    CANCELLED: [],
  };

  if (!allowed[current]?.includes(next)) {
    throw new ValidationError(`لا يمكن الانتقال من حالة ${current} إلى ${next}`);
  }
}

export function workingGroupFilter(
  activeGroupId: string | null,
  includeAllGroups: boolean,
): { groupId?: string } {
  if (includeAllGroups || !activeGroupId) return {};
  return { groupId: activeGroupId };
}

export function isOwnPatrolAssignee(
  assignedUserId: string | null | undefined,
  actorId: string,
): boolean {
  return Boolean(assignedUserId && assignedUserId === actorId);
}

export function assertCanActOnOwnOrManagePatrol(params: {
  actor: AuthenticatedUser;
  assignedUserId: string | null | undefined;
  managePermission: string;
}): void {
  if (params.actor.permissions.includes(params.managePermission)) return;
  if (isOwnPatrolAssignee(params.assignedUserId, params.actor.id)) return;
  throw new ForbiddenError('يمكنك تنفيذ هذا الإجراء فقط على جولاتك المسندة إليك');
}

export function assertNotBusyForSuggestion(status: OperationalStatus): boolean {
  return (
    status !== OperationalStatus.OFF_DUTY &&
    status !== OperationalStatus.ON_BREAK &&
    status !== OperationalStatus.HANDLING_INCIDENT
  );
}
