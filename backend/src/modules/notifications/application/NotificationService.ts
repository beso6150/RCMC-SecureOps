import {
  NotificationActionType,
  NotificationCategory,
  NotificationKind,
  NotificationPriority,
  NotificationStatus,
  Prisma,
} from '@prisma/client';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { emitToUser } from '../../../shared/realtime/socketServer.js';
import { AuthenticatedUser } from '../../identity/domain/types.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { NotificationListFilters, CreateNotificationData } from '../domain/types.js';
import { notificationRepository } from '../infrastructure/NotificationRepository.js';
import { notificationDeduplicationService } from './NotificationDeduplicationService.js';
import { notificationDeliveryService } from './NotificationDeliveryService.js';
import { nextNotificationNumber } from './notificationNumbering.js';
import { prisma } from '../../../shared/database/prisma.js';
import { notificationInclude } from '../domain/types.js';
import {
  assertCanSnooze,
  isEligibleForBulkAcknowledge,
  resolveSnoozeUntil,
} from './snoozePolicy.js';

function emitNotificationDashboard(userId: string, reason: string): void {
  emitToUser(userId, 'dashboard:refresh', { reason });
  emitToUser(userId, 'notifications:dashboard-refresh', { reason });
}

class NotificationService {
  async list(user: AuthenticatedUser, filters: NotificationListFilters) {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const { rows, total } = await notificationRepository.list(user.id, filters);
    return {
      data: rows,
      meta: { page, pageSize, total },
    };
  }

  async getById(user: AuthenticatedUser, id: string) {
    const notification = await notificationRepository.findByIdForUser(id, user.id);
    if (!notification) throw new NotFoundError('الإشعار غير موجود');
    return notification;
  }

  async markRead(user: AuthenticatedUser, id: string) {
    const notification = await notificationRepository.markRead(id, user.id);
    if (!notification) throw new NotFoundError('الإشعار غير موجود');
    emitNotificationDashboard(user.id, 'notification:read');
    return notification;
  }

  async markAllRead(user: AuthenticatedUser) {
    const updated = await notificationRepository.markAllRead(user.id);
    emitNotificationDashboard(user.id, 'notification:read-all');
    return { updated };
  }

  async unreadCount(user: AuthenticatedUser) {
    const count = await notificationRepository.unreadCount(user.id);
    return { count };
  }

  async acknowledge(user: AuthenticatedUser, id: string) {
    const existing = await notificationRepository.findByIdForUser(id, user.id);
    if (!existing) throw new NotFoundError('الإشعار غير موجود');

    if (existing.status === NotificationStatus.ACKNOWLEDGED) {
      return existing;
    }

    if (!existing.requiresAcknowledgement) {
      throw new ValidationError('هذا الإشعار لا يتطلب إقراراً');
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
        acknowledgedById: user.id,
        isRead: true,
        readAt: existing.readAt ?? new Date(),
      },
      include: notificationInclude,
    });

    emitToUser(user.id, 'notification:acknowledged', notification);
    emitNotificationDashboard(user.id, 'notification:acknowledged');
    return notification;
  }

  /**
   * Acknowledge all non-CRITICAL / non-SOS notifications that require ack for this user.
   */
  async acknowledgeAllAllowed(user: AuthenticatedUser) {
    const pending = await prisma.notification.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        requiresAcknowledgement: true,
        acknowledgedAt: null,
        status: {
          notIn: [
            NotificationStatus.CANCELLED,
            NotificationStatus.EXPIRED,
            NotificationStatus.ACKNOWLEDGED,
          ],
        },
        priority: { not: NotificationPriority.CRITICAL },
        NOT: { category: NotificationCategory.SOS },
      },
      select: {
        id: true,
        priority: true,
        category: true,
        requiresAcknowledgement: true,
        acknowledgedAt: true,
      },
    });

    const eligibleIds = pending
      .filter((n) =>
        isEligibleForBulkAcknowledge({
          priority: n.priority,
          category: n.category,
          requiresAcknowledgement: n.requiresAcknowledgement,
          acknowledgedAt: n.acknowledgedAt,
        }),
      )
      .map((n) => n.id);

    if (eligibleIds.length === 0) {
      return { updated: 0 };
    }

    const now = new Date();
    const result = await prisma.notification.updateMany({
      where: { id: { in: eligibleIds }, userId: user.id },
      data: {
        status: NotificationStatus.ACKNOWLEDGED,
        acknowledgedAt: now,
        acknowledgedById: user.id,
        isRead: true,
        readAt: now,
      },
    });

    emitNotificationDashboard(user.id, 'notification:acknowledge-all-allowed');
    return { updated: result.count };
  }

  async snooze(
    user: AuthenticatedUser,
    id: string,
    input: { until?: string | Date | null; minutes?: number | null },
  ) {
    const existing = await notificationRepository.findByIdForUser(id, user.id);
    if (!existing) throw new NotFoundError('الإشعار غير موجود');

    assertCanSnooze({ priority: existing.priority, category: existing.category });

    const snoozeUntil = resolveSnoozeUntil({
      until: input.until,
      minutes: input.minutes,
    });

    const prevMeta =
      existing.metadataJson &&
      typeof existing.metadataJson === 'object' &&
      !Array.isArray(existing.metadataJson)
        ? (existing.metadataJson as Record<string, unknown>)
        : {};

    const notification = await prisma.notification.update({
      where: { id },
      data: {
        scheduledFor: snoozeUntil,
        metadataJson: {
          ...prevMeta,
          snoozeUntil: snoozeUntil.toISOString(),
        } as Prisma.InputJsonValue,
      },
      include: notificationInclude,
    });

    emitToUser(user.id, 'notification:snoozed', {
      id,
      snoozeUntil: snoozeUntil.toISOString(),
    });
    emitNotificationDashboard(user.id, 'notification:snoozed');
    return notification;
  }

  async cancel(user: AuthenticatedUser, id: string) {
    const existing = await prisma.notification.findFirst({
      where: { id, deletedAt: null },
      include: notificationInclude,
    });
    if (!existing) throw new NotFoundError('الإشعار غير موجود');

    const isOwner = existing.userId === user.id;
    const canManage = user.permissions.includes(PermissionCodes.NOTIFICATIONS_UPDATE);

    if (!isOwner && !canManage) {
      throw new ForbiddenError('لا يمكنك إلغاء هذا الإشعار');
    }

    const cancellableStatuses: NotificationStatus[] = [
      NotificationStatus.PENDING,
      NotificationStatus.UNREAD,
      NotificationStatus.SENT,
      NotificationStatus.DELIVERED,
    ];
    if (!cancellableStatuses.includes(existing.status)) {
      throw new ValidationError('لا يمكن إلغاء هذا الإشعار في حالته الحالية');
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.CANCELLED },
      include: notificationInclude,
    });

    emitToUser(existing.userId, 'notification:cancelled', { id });
    emitNotificationDashboard(existing.userId, 'notification:cancelled');
    return notification;
  }

  /** Bell / dashboard summary — alias-friendly shape. */
  async summary(user: AuthenticatedUser) {
    const stats = await this.statistics(user);
    return {
      unreadCount: stats.unread,
      ackRequiredCount: stats.requiresAcknowledgement,
      byPriority: stats.byPriority,
      unread: stats.unread,
      requiresAcknowledgement: stats.requiresAcknowledgement,
    };
  }

  async statistics(user: AuthenticatedUser) {
    const [unread, requiresAck, byPriority] = await Promise.all([
      prisma.notification.count({
        where: {
          userId: user.id,
          deletedAt: null,
          status: { not: NotificationStatus.CANCELLED },
          OR: [{ status: NotificationStatus.UNREAD }, { isRead: false }],
        },
      }),
      prisma.notification.count({
        where: {
          userId: user.id,
          deletedAt: null,
          requiresAcknowledgement: true,
          acknowledgedAt: null,
          status: { notIn: [NotificationStatus.CANCELLED, NotificationStatus.EXPIRED] },
        },
      }),
      prisma.notification.groupBy({
        by: ['priority'],
        where: {
          userId: user.id,
          deletedAt: null,
          status: { not: NotificationStatus.CANCELLED },
        },
        _count: { _all: true },
      }),
    ]);

    return {
      unread,
      requiresAcknowledgement: requiresAck,
      byPriority: byPriority.map((r) => ({
        priority: r.priority,
        count: r._count._all,
      })),
    };
  }

  /** Internal helper for other modules to deliver inbox notifications. */
  async create(data: CreateNotificationData) {
    if (data.deduplicationKey) {
      const dup = await notificationDeduplicationService.findRecentDuplicate({
        userId: data.userId,
        deduplicationKey: data.deduplicationKey,
      });
      if (dup) {
        return prisma.notification.findFirstOrThrow({
          where: { id: dup.id },
          include: notificationInclude,
        });
      }
    }

    const priority = data.priority ?? NotificationPriority.NORMAL;
    const category = data.category ?? null;
    const kind =
      (data.kind as NotificationKind | undefined) ??
      (data.requiresAcknowledgement
        ? NotificationKind.ACKNOWLEDGEMENT_REQUIRED
        : NotificationKind.INFORMATIONAL);

    const gate = await notificationDeliveryService.evaluatePreferenceGate({
      userId: data.userId,
      category,
      priority,
      kind,
      entityType: data.entityType,
    });

    const notificationNumber = await nextNotificationNumber();
    const status =
      gate.allowInApp || gate.allowSocket
        ? NotificationStatus.UNREAD
        : NotificationStatus.SENT;

    const notification = await prisma.notification.create({
      data: {
        notificationNumber,
        userId: data.userId,
        senderId: data.senderId ?? null,
        title: data.title,
        body: data.body,
        shortBody: data.shortBody ?? null,
        priority,
        status,
        kind,
        category: category ?? undefined,
        channel: 'IN_APP',
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        actionUrl: data.actionUrl ?? null,
        actionType:
          (data.actionType as NotificationActionType | undefined) ?? NotificationActionType.OPEN,
        requiresAcknowledgement: data.requiresAcknowledgement ?? false,
        isRead: false,
        deduplicationKey: data.deduplicationKey ?? null,
        metadataJson: (data.metadataJson ?? null) as Prisma.InputJsonValue,
        recipientRole: data.recipientRole ?? null,
        recipientGroupId: data.recipientGroupId ?? null,
        recipientShiftId: data.recipientShiftId ?? null,
        expiresAt: data.expiresAt ?? null,
        scheduledFor: data.scheduledFor ?? null,
      },
      include: notificationInclude,
    });

    let socketDelivered = false;
    if (gate.allowSocket) {
      emitToUser(data.userId, 'notification:new', notification);
      emitNotificationDashboard(data.userId, 'notification:new');
      socketDelivered = true;
    } else if (gate.allowInApp) {
      emitNotificationDashboard(data.userId, 'notification:new');
    }

    await notificationDeliveryService.createStandardDeliveries({
      notificationId: notification.id,
      userId: data.userId,
      socketDelivered,
      skipInApp: !gate.allowInApp,
      skipSocket: !gate.allowSocket,
      skipReason: gate.skipReason,
    });

    if (gate.allowInApp && !notification.deliveredAt) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { deliveredAt: new Date() },
      });
    }

    return notification;
  }
}

export const notificationService = new NotificationService();
