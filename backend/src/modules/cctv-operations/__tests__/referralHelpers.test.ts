import { describe, expect, it } from 'vitest';
import { SecurityReferralStatus } from '@prisma/client';
import {
  assertCctvCannotClose,
  assertPermitDateRange,
  assertReferralTransition,
  canCancelBeforeReceive,
  isForbiddenExtension,
} from '../application/referralStatusMachine.js';
import { maskNationalId } from '../application/maskNationalId.js';
import { shouldEscalateUnreceived } from '../application/escalationPolicy.js';
import { RoleCodes } from '../../identity/domain/roleCodes.js';

describe('referral status machine', () => {
  it('allows NEW -> SENT', () => {
    expect(() =>
      assertReferralTransition(SecurityReferralStatus.NEW, SecurityReferralStatus.SENT),
    ).not.toThrow();
  });

  it('blocks NEW -> RESOLVED', () => {
    expect(() =>
      assertReferralTransition(SecurityReferralStatus.NEW, SecurityReferralStatus.RESOLVED),
    ).toThrow(/لا يمكن الانتقال/);
  });

  it('allows cancel before receive', () => {
    expect(canCancelBeforeReceive(SecurityReferralStatus.SENT)).toBe(true);
    expect(canCancelBeforeReceive(SecurityReferralStatus.RECEIVED)).toBe(false);
  });

  it('blocks invalid SENT -> CLOSED', () => {
    expect(() =>
      assertReferralTransition(SecurityReferralStatus.SENT, SecurityReferralStatus.CLOSED),
    ).toThrow(/لا يمكن الانتقال/);
  });
});

describe('CCTV close restrictions', () => {
  it('blocks CCTV operator from closing', () => {
    expect(() => assertCctvCannotClose(RoleCodes.CCTV_OPERATOR)).toThrow(/لا تغلق/);
  });

  it('allows supervisor close', () => {
    expect(() => assertCctvCannotClose(RoleCodes.SECURITY_SUPERVISOR)).not.toThrow();
  });
});

describe('permit dates', () => {
  it('rejects validTo before validFrom', () => {
    expect(() =>
      assertPermitDateRange(new Date('2026-07-22T12:00:00Z'), new Date('2026-07-22T10:00:00Z')),
    ).toThrow(/قبل تاريخ الانتهاء/);
  });
});

describe('national id masking', () => {
  it('masks for non-sensitive viewers', () => {
    expect(maskNationalId('1000000004', false)).toBe('**********0004');
  });

  it('shows full for sensitive permission', () => {
    expect(maskNationalId('1000000004', true)).toBe('1000000004');
  });
});

describe('forbidden files', () => {
  it('rejects executables and scripts', () => {
    expect(isForbiddenExtension('payload.exe')).toBe(true);
    expect(isForbiddenExtension('run.bat')).toBe(true);
    expect(isForbiddenExtension('x.ps1')).toBe(true);
    expect(isForbiddenExtension('a.js')).toBe(true);
    expect(isForbiddenExtension('p.html')).toBe(true);
    expect(isForbiddenExtension('note.pdf')).toBe(false);
  });
});

describe('escalation policy', () => {
  const settings = {
    escalateReceiveMinutes: 5,
    escalateHighReceiveMinutes: 3,
    escalateStartMinutes: 10,
    criticalNotifyDirector: true,
  };

  it('escalates CRITICAL immediately', () => {
    const r = shouldEscalateUnreceived({
      severity: 'CRITICAL',
      sentAt: new Date(),
      settings,
    });
    expect(r.escalate).toBe(true);
    expect(r.notifyDirector).toBe(true);
  });

  it('escalates HIGH after 3 minutes', () => {
    const sentAt = new Date(Date.now() - 4 * 60_000);
    const r = shouldEscalateUnreceived({ severity: 'HIGH', sentAt, settings });
    expect(r.escalate).toBe(true);
    expect(r.notifyOps).toBe(true);
  });

  it('does not escalate MEDIUM before timeout', () => {
    const sentAt = new Date(Date.now() - 2 * 60_000);
    const r = shouldEscalateUnreceived({ severity: 'MEDIUM', sentAt, settings });
    expect(r.escalate).toBe(false);
  });
});
