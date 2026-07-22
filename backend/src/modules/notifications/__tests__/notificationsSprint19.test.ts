import { describe, expect, it } from 'vitest';
import { NotificationCategory, NotificationPriority, NotificationStatus } from '@prisma/client';
import {
  isDeliveryBlockedByQuietHours,
  isWithinQuietHours,
  parseTimeToMinutes,
  shouldBypassQuietHours,
} from '../application/quietHours.js';
import {
  assertCanDisableCategory,
  cannotMuteNotification,
  isUnmuteableCategory,
} from '../application/mutePolicy.js';
import {
  DEFAULT_DEDUPE_WINDOW_MS,
  notificationDeduplicationService,
} from '../application/NotificationDeduplicationService.js';
import { formatNotificationNumber } from '../application/notificationNumbering.js';
import { DEFAULT_NOTIFICATION_RULES } from '../application/NotificationRuleService.js';
import {
  assertCanSnooze,
  isEligibleForBulkAcknowledge,
  isSnoozeForbidden,
  resolveSnoozeUntil,
} from '../application/snoozePolicy.js';

describe('quiet hours', () => {
  it('parses HH:mm', () => {
    expect(parseTimeToMinutes('22:00')).toBe(22 * 60);
    expect(parseTimeToMinutes('06:30')).toBe(6 * 60 + 30);
    expect(parseTimeToMinutes('bad')).toBeNull();
  });

  it('supports midnight wrap', () => {
    const late = new Date('2026-07-22T20:00:00.000Z');
    expect(isWithinQuietHours(late, '22:00', '06:00')).toBe(true);

    const noon = new Date('2026-07-22T09:00:00.000Z');
    expect(isWithinQuietHours(noon, '22:00', '06:00')).toBe(false);
  });

  it('bypasses quiet hours for CRITICAL', () => {
    expect(shouldBypassQuietHours(NotificationPriority.CRITICAL)).toBe(true);
    expect(shouldBypassQuietHours(NotificationPriority.URGENT)).toBe(true);
    expect(shouldBypassQuietHours(NotificationPriority.NORMAL)).toBe(false);

    const late = new Date('2026-07-22T20:00:00.000Z');
    expect(
      isDeliveryBlockedByQuietHours({
        now: late,
        quietHoursEnabled: true,
        quietHoursFrom: '22:00',
        quietHoursTo: '06:00',
        priority: NotificationPriority.CRITICAL,
      }),
    ).toBe(false);

    expect(
      isDeliveryBlockedByQuietHours({
        now: late,
        quietHoursEnabled: true,
        quietHoursFrom: '22:00',
        quietHoursTo: '06:00',
        priority: NotificationPriority.NORMAL,
      }),
    ).toBe(true);
  });
});

describe('mute policy', () => {
  it('cannot mute SOS / EMERGENCY categories', () => {
    expect(isUnmuteableCategory(NotificationCategory.SOS)).toBe(true);
    expect(isUnmuteableCategory(NotificationCategory.EMERGENCY)).toBe(true);
    expect(isUnmuteableCategory(NotificationCategory.PERMIT)).toBe(false);
    expect(() => assertCanDisableCategory(NotificationCategory.SOS)).toThrow(/كتم/);
  });

  it('cannot mute CRITICAL or assigned CCTV referrals', () => {
    expect(
      cannotMuteNotification({
        priority: NotificationPriority.CRITICAL,
        category: NotificationCategory.SYSTEM,
      }),
    ).toBe(true);

    expect(
      cannotMuteNotification({
        category: NotificationCategory.CCTV_REFERRAL,
        kind: 'ACTION_REQUIRED',
        entityType: 'SecurityReferral',
      }),
    ).toBe(true);

    expect(
      cannotMuteNotification({
        category: NotificationCategory.PERMIT,
        priority: NotificationPriority.NORMAL,
      }),
    ).toBe(false);
  });
});

describe('notification deduplication', () => {
  it('dedupes within window for non-cancelled', () => {
    const now = new Date('2026-07-22T12:00:00.000Z');
    const recent = new Date(now.getTime() - 60_000);
    expect(
      notificationDeduplicationService.shouldDeduplicate({
        existingStatus: NotificationStatus.UNREAD,
        createdAt: recent,
        now,
        windowMs: DEFAULT_DEDUPE_WINDOW_MS,
      }),
    ).toBe(true);
  });

  it('does not dedupe cancelled or expired window', () => {
    const now = new Date('2026-07-22T12:00:00.000Z');
    expect(
      notificationDeduplicationService.shouldDeduplicate({
        existingStatus: NotificationStatus.CANCELLED,
        createdAt: new Date(now.getTime() - 60_000),
        now,
      }),
    ).toBe(false);

    expect(
      notificationDeduplicationService.shouldDeduplicate({
        existingStatus: NotificationStatus.UNREAD,
        createdAt: new Date(now.getTime() - DEFAULT_DEDUPE_WINDOW_MS - 1),
        now,
      }),
    ).toBe(false);
  });
});

describe('notification numbering', () => {
  it('formats NTF-YYYY-######', () => {
    expect(formatNotificationNumber(2026, 1)).toBe('NTF-2026-000001');
    expect(formatNotificationNumber(2026, 42)).toBe('NTF-2026-000042');
    expect(() => formatNotificationNumber(2026, 0)).toThrow();
  });
});

describe('default notification rules', () => {
  it('includes required Sprint 19 rule event types', () => {
    const events = DEFAULT_NOTIFICATION_RULES.map((r) => r.eventType);
    expect(events).toContain('sos.critical');
    expect(events).toContain('incident.critical');
    expect(events).toContain('incident.high');
    expect(events).toContain('cctv.referral.assigned');
    expect(events).toContain('permit.shared.normal');
    expect(events).toContain('permit.shared.urgent');
    expect(events).toContain('patrol.overdue');
    expect(events).toContain('report.approval.requested');
  });
});

describe('snooze / bulk-ack policy', () => {
  it('forbids snooze for CRITICAL and SOS', () => {
    expect(isSnoozeForbidden({ priority: NotificationPriority.CRITICAL })).toBe(true);
    expect(isSnoozeForbidden({ category: NotificationCategory.SOS })).toBe(true);
    expect(() =>
      assertCanSnooze({ priority: NotificationPriority.CRITICAL }),
    ).toThrow(/تأجيل/);
    expect(isSnoozeForbidden({ priority: NotificationPriority.NORMAL })).toBe(false);
  });

  it('resolves snooze until from minutes', () => {
    const now = new Date('2026-07-22T12:00:00.000Z');
    const until = resolveSnoozeUntil({ minutes: 30, now });
    expect(until.toISOString()).toBe('2026-07-22T12:30:00.000Z');
  });

  it('skips CRITICAL/SOS from bulk acknowledge eligibility', () => {
    expect(
      isEligibleForBulkAcknowledge({
        requiresAcknowledgement: true,
        priority: NotificationPriority.CRITICAL,
      }),
    ).toBe(false);
    expect(
      isEligibleForBulkAcknowledge({
        requiresAcknowledgement: true,
        category: NotificationCategory.SOS,
        priority: NotificationPriority.HIGH,
      }),
    ).toBe(false);
    expect(
      isEligibleForBulkAcknowledge({
        requiresAcknowledgement: true,
        priority: NotificationPriority.NORMAL,
      }),
    ).toBe(true);
  });
});
