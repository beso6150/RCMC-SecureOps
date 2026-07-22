import { describe, expect, it } from 'vitest';
import { IncidentSeverity, IncidentStatus } from '@prisma/client';
import { RoleCodes } from '../../identity/domain/roleCodes.js';
import { formatIncidentNumber } from '../application/incidentNumbering.js';
import {
  assertCanCloseIncident,
  assertFalseAlarmReason,
  assertIncidentTransition,
} from '../application/incidentLifecycle.js';
import { INCIDENT_STATUS_TRANSITIONS } from '../domain/constants.js';

describe('incident status transitions', () => {
  it('keeps legacy mobile path NEW → ASSIGNED → IN_PROGRESS → CLOSED', () => {
    expect(() =>
      assertIncidentTransition(IncidentStatus.NEW, IncidentStatus.ASSIGNED),
    ).not.toThrow();
    expect(() =>
      assertIncidentTransition(IncidentStatus.ASSIGNED, IncidentStatus.IN_PROGRESS),
    ).not.toThrow();
    expect(() =>
      assertIncidentTransition(IncidentStatus.IN_PROGRESS, IncidentStatus.CLOSED),
    ).not.toThrow();
  });

  it('allows ON_HOLD resume paths', () => {
    expect(INCIDENT_STATUS_TRANSITIONS.ON_HOLD).toContain(IncidentStatus.IN_PROGRESS);
    expect(INCIDENT_STATUS_TRANSITIONS.ASSIGNED).toContain(IncidentStatus.ON_HOLD);
  });

  it('supports full ops lifecycle REPORTED → … → RESOLVED → CLOSED', () => {
    expect(() =>
      assertIncidentTransition(IncidentStatus.REPORTED, IncidentStatus.ACKNOWLEDGED),
    ).not.toThrow();
    expect(() =>
      assertIncidentTransition(IncidentStatus.ACKNOWLEDGED, IncidentStatus.ASSESSING),
    ).not.toThrow();
    expect(() =>
      assertIncidentTransition(IncidentStatus.ASSESSING, IncidentStatus.ASSIGNED),
    ).not.toThrow();
    expect(() =>
      assertIncidentTransition(IncidentStatus.ASSIGNED, IncidentStatus.RESPONDING),
    ).not.toThrow();
    expect(() =>
      assertIncidentTransition(IncidentStatus.RESPONDING, IncidentStatus.ON_SCENE),
    ).not.toThrow();
    expect(() =>
      assertIncidentTransition(IncidentStatus.ON_SCENE, IncidentStatus.CONTAINED),
    ).not.toThrow();
    expect(() =>
      assertIncidentTransition(IncidentStatus.CONTAINED, IncidentStatus.RESOLVED),
    ).not.toThrow();
    expect(() =>
      assertIncidentTransition(IncidentStatus.RESOLVED, IncidentStatus.CLOSED),
    ).not.toThrow();
  });

  it('blocks invalid jumps', () => {
    expect(() =>
      assertIncidentTransition(IncidentStatus.NEW, IncidentStatus.CLOSED),
    ).toThrow(/لا يمكن الانتقال/);
    expect(() =>
      assertIncidentTransition(IncidentStatus.CLOSED, IncidentStatus.ASSIGNED),
    ).toThrow(/لا يمكن الانتقال/);
  });

  it('allows reopen from CLOSED', () => {
    expect(() =>
      assertIncidentTransition(IncidentStatus.CLOSED, IncidentStatus.REOPENED),
    ).not.toThrow();
  });
});

describe('critical close rules for guards', () => {
  it('blocks guard closing CRITICAL', () => {
    expect(() =>
      assertCanCloseIncident({
        roleCode: RoleCodes.SECURITY_GUARD,
        severity: IncidentSeverity.CRITICAL,
        fromStatus: IncidentStatus.RESOLVED,
      }),
    ).toThrow(/لا يمكن للحارس/);
  });

  it('blocks guard closing HIGH', () => {
    expect(() =>
      assertCanCloseIncident({
        roleCode: RoleCodes.SECURITY_GUARD,
        severity: IncidentSeverity.HIGH,
        fromStatus: IncidentStatus.IN_PROGRESS,
      }),
    ).toThrow(/لا يمكن للحارس/);
  });

  it('allows supervisor closing CRITICAL', () => {
    expect(() =>
      assertCanCloseIncident({
        roleCode: RoleCodes.SECURITY_SUPERVISOR,
        severity: IncidentSeverity.CRITICAL,
        fromStatus: IncidentStatus.RESOLVED,
      }),
    ).not.toThrow();
  });

  it('blocks CCTV operator from closing', () => {
    expect(() =>
      assertCanCloseIncident({
        roleCode: RoleCodes.CCTV_OPERATOR,
        severity: IncidentSeverity.LOW,
        fromStatus: IncidentStatus.RESOLVED,
      }),
    ).toThrow(/لا تغلق/);
  });
});

describe('incident numbering', () => {
  it('formats INC-YYYY-######', () => {
    expect(formatIncidentNumber(2026, 1)).toBe('INC-2026-000001');
    expect(formatIncidentNumber(2026, 42)).toBe('INC-2026-000042');
    expect(formatIncidentNumber(2026, 123456)).toBe('INC-2026-123456');
  });

  it('rejects invalid sequence', () => {
    expect(() => formatIncidentNumber(2026, 0)).toThrow();
  });
});

describe('false alarm reason', () => {
  it('requires a non-empty reason', () => {
    expect(() => assertFalseAlarmReason('')).toThrow(/سبب الإنذار الكاذب/);
    expect(() => assertFalseAlarmReason('   ')).toThrow(/سبب الإنذار الكاذب/);
    expect(() => assertFalseAlarmReason(null)).toThrow(/سبب الإنذار الكاذب/);
  });

  it('accepts trimmed reason', () => {
    expect(assertFalseAlarmReason('  إنذار جهاز دخان تالف  ')).toBe('إنذار جهاز دخان تالف');
  });
});
