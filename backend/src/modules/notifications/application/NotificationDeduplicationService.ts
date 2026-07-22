import { NotificationStatus } from '@prisma/client';
import { prisma } from '../../../shared/database/prisma.js';

export const DEFAULT_DEDUPE_WINDOW_MS = 5 * 60 * 1000;

class NotificationDeduplicationService {
  /**
   * Returns an existing recent non-cancelled notification for the same
   * deduplicationKey + userId within the window, if any.
   */
  async findRecentDuplicate(input: {
    userId: string;
    deduplicationKey: string;
    windowMs?: number;
    now?: Date;
  }) {
    const windowMs = input.windowMs ?? DEFAULT_DEDUPE_WINDOW_MS;
    const now = input.now ?? new Date();
    const since = new Date(now.getTime() - windowMs);

    return prisma.notification.findFirst({
      where: {
        userId: input.userId,
        deduplicationKey: input.deduplicationKey,
        deletedAt: null,
        status: { not: NotificationStatus.CANCELLED },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Pure helper for unit tests. */
  isWithinWindow(createdAt: Date, now: Date, windowMs: number): boolean {
    return now.getTime() - createdAt.getTime() <= windowMs;
  }

  shouldDeduplicate(input: {
    existingStatus: NotificationStatus | null | undefined;
    createdAt: Date | null | undefined;
    now?: Date;
    windowMs?: number;
  }): boolean {
    if (!input.existingStatus || !input.createdAt) return false;
    if (input.existingStatus === NotificationStatus.CANCELLED) return false;
    return this.isWithinWindow(
      input.createdAt,
      input.now ?? new Date(),
      input.windowMs ?? DEFAULT_DEDUPE_WINDOW_MS,
    );
  }
}

export const notificationDeduplicationService = new NotificationDeduplicationService();
