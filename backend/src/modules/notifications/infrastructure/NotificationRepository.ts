import { NotificationStatus, Prisma } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';
import {
  CreateNotificationData,
  NotificationListFilters,
  NotificationWithSender,
  notificationInclude,
} from '../domain/types.js';
import { nextNotificationNumber } from '../application/notificationNumbering.js';

export class NotificationRepository {
  async list(
    userId: string,
    filters: NotificationListFilters,
  ): Promise<{ rows: NotificationWithSender[]; total: number }> {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const skip = (page - 1) * pageSize;

    const where: Prisma.NotificationWhereInput = {
      userId,
      deletedAt: null,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.isRead !== undefined ? { isRead: filters.isRead } : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: notificationInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
    ]);

    return { rows, total };
  }

  async findByIdForUser(id: string, userId: string): Promise<NotificationWithSender | null> {
    return prisma.notification.findFirst({
      where: { id, userId, deletedAt: null },
      include: notificationInclude,
    });
  }

  async create(data: CreateNotificationData): Promise<NotificationWithSender> {
    const notificationNumber = await nextNotificationNumber();
    return prisma.notification.create({
      data: {
        notificationNumber,
        userId: data.userId,
        senderId: data.senderId ?? null,
        title: data.title,
        body: data.body,
        priority: data.priority,
        status: NotificationStatus.UNREAD,
        isRead: false,
        entityType: data.entityType ?? null,
        entityId: data.entityId ?? null,
        category: data.category ?? undefined,
        kind: (data.kind as never) ?? undefined,
        actionUrl: data.actionUrl ?? null,
        requiresAcknowledgement: data.requiresAcknowledgement ?? false,
        deduplicationKey: data.deduplicationKey ?? null,
      },
      include: notificationInclude,
    });
  }

  async markRead(id: string, userId: string): Promise<NotificationWithSender | null> {
    const existing = await this.findByIdForUser(id, userId);
    if (!existing) return null;

    if (existing.status === NotificationStatus.READ && existing.isRead) {
      return existing;
    }

    return prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.READ,
        isRead: true,
        readAt: new Date(),
      },
      include: notificationInclude,
    });
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        deletedAt: null,
        OR: [{ status: NotificationStatus.UNREAD }, { isRead: false }],
      },
      data: {
        status: NotificationStatus.READ,
        isRead: true,
        readAt: new Date(),
      },
    });
    return result.count;
  }

  async unreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        deletedAt: null,
        OR: [{ status: NotificationStatus.UNREAD }, { isRead: false }],
      },
    });
  }
}

export const notificationRepository = new NotificationRepository();
