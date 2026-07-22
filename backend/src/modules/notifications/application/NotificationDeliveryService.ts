import {
  NotificationCategory,
  NotificationDeliveryChannel,
  NotificationDeliveryStatus,
  NotificationPriority,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import { isDeliveryBlockedByQuietHours } from './quietHours.js';
import { cannotMuteNotification } from './mutePolicy.js';

const PRIORITY_RANK: Record<NotificationPriority, number> = {
  LOW: 1,
  NORMAL: 2,
  HIGH: 3,
  URGENT: 4,
  CRITICAL: 5,
};

class NotificationDeliveryService {
  /**
   * Create delivery rows for IN_APP + SOCKET (success path) and mark
   * WEB_PUSH / MOBILE_PUSH as SKIPPED unless push is configured (it is not).
   */
  async createStandardDeliveries(input: {
    notificationId: string;
    userId: string;
    socketDelivered: boolean;
    skipInApp?: boolean;
    skipSocket?: boolean;
    skipReason?: string | null;
  }) {
    const now = new Date();
    const rows: Prisma.NotificationDeliveryCreateManyInput[] = [];

    if (!input.skipInApp) {
      rows.push({
        notificationId: input.notificationId,
        userId: input.userId,
        channel: NotificationDeliveryChannel.IN_APP,
        status: NotificationDeliveryStatus.DELIVERED,
        attemptedAt: now,
        deliveredAt: now,
      });
    } else {
      rows.push({
        notificationId: input.notificationId,
        userId: input.userId,
        channel: NotificationDeliveryChannel.IN_APP,
        status: NotificationDeliveryStatus.SKIPPED,
        attemptedAt: now,
        failureReason: input.skipReason ?? 'تم التخطي حسب تفضيلات المستخدم',
      });
    }

    if (!input.skipSocket) {
      rows.push({
        notificationId: input.notificationId,
        userId: input.userId,
        channel: NotificationDeliveryChannel.SOCKET,
        status: input.socketDelivered
          ? NotificationDeliveryStatus.SENT
          : NotificationDeliveryStatus.FAILED,
        attemptedAt: now,
        deliveredAt: input.socketDelivered ? now : null,
        failureReason: input.socketDelivered ? null : 'تعذر إرسال الإشعار عبر المقبس',
      });
    } else {
      rows.push({
        notificationId: input.notificationId,
        userId: input.userId,
        channel: NotificationDeliveryChannel.SOCKET,
        status: NotificationDeliveryStatus.SKIPPED,
        attemptedAt: now,
        failureReason: input.skipReason ?? 'تم التخطي حسب تفضيلات المستخدم',
      });
    }

    // Push channels exist in schema but are not configured — never claim success.
    for (const channel of [
      NotificationDeliveryChannel.WEB_PUSH,
      NotificationDeliveryChannel.MOBILE_PUSH,
    ]) {
      rows.push({
        notificationId: input.notificationId,
        userId: input.userId,
        channel,
        status: NotificationDeliveryStatus.SKIPPED,
        attemptedAt: now,
        failureReason: 'قناة الدفع غير مفعّلة',
      });
    }

    await prisma.notificationDelivery.createMany({ data: rows });
  }

  async evaluatePreferenceGate(input: {
    userId: string;
    category?: NotificationCategory | null;
    priority: NotificationPriority;
    kind?: string | null;
    entityType?: string | null;
    now?: Date;
  }): Promise<{
    allowInApp: boolean;
    allowSocket: boolean;
    skipReason: string | null;
  }> {
    if (
      cannotMuteNotification({
        category: input.category,
        priority: input.priority,
        kind: input.kind,
        entityType: input.entityType,
      })
    ) {
      return { allowInApp: true, allowSocket: true, skipReason: null };
    }

    if (!input.category) {
      return { allowInApp: true, allowSocket: true, skipReason: null };
    }

    const pref = await prisma.notificationPreference.findUnique({
      where: {
        userId_category: { userId: input.userId, category: input.category },
      },
    });

    if (!pref) {
      return { allowInApp: true, allowSocket: true, skipReason: null };
    }

    if (PRIORITY_RANK[input.priority] < PRIORITY_RANK[pref.minimumPriority]) {
      return {
        allowInApp: false,
        allowSocket: false,
        skipReason: 'الأولوية أقل من الحد الأدنى في التفضيلات',
      };
    }

    const quietBlocked = isDeliveryBlockedByQuietHours({
      now: input.now,
      quietHoursEnabled: pref.quietHoursEnabled,
      quietHoursFrom: pref.quietHoursFrom,
      quietHoursTo: pref.quietHoursTo,
      priority: input.priority,
    });

    if (quietBlocked) {
      return {
        allowInApp: false,
        allowSocket: false,
        skipReason: 'ساعات الهدوء مفعّلة',
      };
    }

    return {
      allowInApp: pref.inAppEnabled,
      allowSocket: pref.socketEnabled,
      skipReason:
        !pref.inAppEnabled && !pref.socketEnabled
          ? 'الفئة مكتومة في تفضيلات المستخدم'
          : null,
    };
  }
}

export const notificationDeliveryService = new NotificationDeliveryService();
