import { describe, expect, it } from 'vitest';
import { OperationalStatus, PatrolSessionStatus } from '@prisma/client';
import {
  assertRestingGroupAssign,
  buildSosAlertPayload,
  canUpdatePersonnelLocation,
  isPatrolLate,
  missedRequiredCheckpoints,
  workingGroupFilter,
} from '../application/fieldOpsHelpers.js';
import {
  euclideanDistance,
  isAvailableForNearest,
  rankNearestPersonnel,
} from '../application/nearestPersonnel.js';
import { RoleCodes } from '../../identity/domain/roleCodes.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import type { AuthenticatedUser } from '../../identity/domain/types.js';

function actor(
  partial: Partial<AuthenticatedUser> & Pick<AuthenticatedUser, 'id' | 'permissions'>,
): AuthenticatedUser {
  return {
    nationalId: '1',
    employeeNumber: 'E1',
    fullName: 'Test',
    email: 't@t.local',
    phone: null,
    jobTitle: null,
    status: 'ACTIVE' as never,
    isFirstLogin: false,
    lastLoginAt: null,
    roleId: 'role',
    roleCode: RoleCodes.SECURITY_GUARD,
    roleNameEn: 'Guard',
    roleNameAr: 'حارس',
    departmentId: null,
    departmentNameAr: null,
    shiftId: null,
    shiftNameAr: null,
    ...partial,
  };
}

describe('workingGroupFilter', () => {
  it('filters to active group when not including all', () => {
    expect(workingGroupFilter('g1', false)).toEqual({ groupId: 'g1' });
  });

  it('returns empty filter when includeAll or no active group', () => {
    expect(workingGroupFilter('g1', true)).toEqual({});
    expect(workingGroupFilter(null, false)).toEqual({});
  });
});

describe('assertRestingGroupAssign', () => {
  it('allows assign when group is not resting', () => {
    const r = assertRestingGroupAssign({
      assigneeGroupId: 'g1',
      isGroupResting: false,
      actorRoleCode: RoleCodes.SECURITY_SUPERVISOR,
    });
    expect(r.overrideRestingGroup).toBe(false);
  });

  it('blocks resting assign for non-director', () => {
    expect(() =>
      assertRestingGroupAssign({
        assigneeGroupId: 'g2',
        isGroupResting: true,
        actorRoleCode: RoleCodes.SECURITY_SUPERVISOR,
        overrideReason: 'urgent',
      }),
    ).toThrow(/مجموعة الراحة/);
  });

  it('allows director with override reason', () => {
    const r = assertRestingGroupAssign({
      assigneeGroupId: 'g2',
      isGroupResting: true,
      actorRoleCode: RoleCodes.SECURITY_DIRECTOR,
      overrideReason: 'حالة طارئة',
    });
    expect(r.overrideRestingGroup).toBe(true);
    expect(r.overrideReason).toBe('حالة طارئة');
  });
});

describe('patrol late & missed checkpoints', () => {
  it('detects late patrol past estimated duration', () => {
    const startedAt = new Date('2026-07-22T08:00:00Z');
    const now = new Date('2026-07-22T09:30:00Z');
    expect(
      isPatrolLate({
        startedAt,
        scheduledStartAt: startedAt,
        estimatedDurationMinutes: 60,
        now,
        status: PatrolSessionStatus.IN_PROGRESS,
      }),
    ).toBe(true);
  });

  it('does not mark terminal sessions as late', () => {
    expect(
      isPatrolLate({
        startedAt: new Date('2026-07-22T08:00:00Z'),
        scheduledStartAt: new Date('2026-07-22T08:00:00Z'),
        estimatedDurationMinutes: 10,
        now: new Date('2026-07-22T12:00:00Z'),
        status: PatrolSessionStatus.COMPLETED,
      }),
    ).toBe(false);
  });

  it('lists missed required checkpoints', () => {
    expect(
      missedRequiredCheckpoints({
        requiredCheckpointIds: ['a', 'b', 'c'],
        visitedCheckpointIds: ['a', 'c'],
      }),
    ).toEqual(['b']);
  });
});

describe('nearest personnel', () => {
  it('ranks by euclidean distance preferring fresh locations', () => {
    const ranked = rankNearestPersonnel(
      { mapX: 0, mapY: 0 },
      [
        {
          userId: '1',
          fullName: 'Far Fresh',
          employeeNumber: 'E1',
          operationalStatus: OperationalStatus.ON_DUTY,
          mapX: 100,
          mapY: 0,
          locationSource: 'personnel',
          isFresh: true,
        },
        {
          userId: '2',
          fullName: 'Near Stale',
          employeeNumber: 'E2',
          operationalStatus: OperationalStatus.ON_DUTY,
          mapX: 10,
          mapY: 0,
          locationSource: 'personnel',
          isFresh: false,
        },
        {
          userId: '3',
          fullName: 'Near Fresh',
          employeeNumber: 'E3',
          operationalStatus: OperationalStatus.ON_DUTY,
          mapX: 20,
          mapY: 0,
          locationSource: 'personnel',
          isFresh: true,
        },
        {
          userId: '4',
          fullName: 'Busy',
          employeeNumber: 'E4',
          operationalStatus: OperationalStatus.ON_BREAK,
          mapX: 1,
          mapY: 0,
          locationSource: 'personnel',
          isFresh: true,
        },
      ],
      3,
    );

    expect(ranked.map((r) => r.userId)).toEqual(['3', '1', '2']);
    expect(euclideanDistance({ mapX: 0, mapY: 0 }, { mapX: 3, mapY: 4 })).toBe(5);
    expect(isAvailableForNearest(OperationalStatus.ON_BREAK)).toBe(false);
  });
});

describe('location permissions', () => {
  it('allows self update with update_self', () => {
    const a = actor({
      id: 'u1',
      permissions: [PermissionCodes.PERSONNEL_LOCATIONS_UPDATE_SELF],
    });
    expect(canUpdatePersonnelLocation(a, 'u1').allowed).toBe(true);
  });

  it('denies updating another user without update_any', () => {
    const a = actor({
      id: 'u1',
      permissions: [PermissionCodes.PERSONNEL_LOCATIONS_UPDATE_SELF],
    });
    expect(canUpdatePersonnelLocation(a, 'u2').allowed).toBe(false);
  });

  it('allows update_any for other users', () => {
    const a = actor({
      id: 'u1',
      roleCode: RoleCodes.SECURITY_SUPERVISOR,
      permissions: [PermissionCodes.PERSONNEL_LOCATIONS_UPDATE_ANY],
    });
    expect(canUpdatePersonnelLocation(a, 'u2').mode).toBe('any');
  });
});

describe('SOS payload', () => {
  it('builds critical SOS alert payload', () => {
    const payload = buildSosAlertPayload({
      actorId: 'u1',
      actorName: 'حارس',
      mapX: 10,
      mapY: 20,
    });
    expect(payload.alertType).toBe('SOS');
    expect(payload.severity).toBe('CRITICAL');
    expect(payload.createdById).toBe('u1');
    expect(payload.title).toContain('استغاثة');
  });
});
