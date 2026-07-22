import {
  NotificationCategory,
  NotificationPriority,
  Prisma,
} from '@prisma/client';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { prisma } from '../../../shared/database/prisma.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { AuthenticatedUser } from '../../identity/domain/types.js';
import { assertCanDisableCategory, isUnmuteableCategory } from './mutePolicy.js';
import { parseTimeToMinutes } from './quietHours.js';

export interface UpsertPreferenceInput {
  category: NotificationCategory;
  inAppEnabled?: boolean;
  socketEnabled?: boolean;
  pushEnabled?: boolean;
  soundEnabled?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursFrom?: string | null;
  quietHoursTo?: string | null;
  minimumPriority?: NotificationPriority;
}

class NotificationPreferenceService {
  async listForUser(user: AuthenticatedUser) {
    return prisma.notificationPreference.findMany({
      where: { userId: user.id },
      orderBy: { category: 'asc' },
    });
  }

  async upsert(user: AuthenticatedUser, input: UpsertPreferenceInput) {
    if (
      !user.permissions.includes(PermissionCodes.NOTIFICATIONS_UPDATE) &&
      !user.permissions.includes(PermissionCodes.NOTIFICATIONS_PREFERENCES_UPDATE)
    ) {
      throw new ForbiddenError('Missing permission to update notification preferences');
    }

    const disabling =
      input.inAppEnabled === false &&
      input.socketEnabled === false &&
      (input.pushEnabled === false || input.pushEnabled === undefined);

    if (disabling || input.inAppEnabled === false) {
      try {
        assertCanDisableCategory(input.category);
      } catch (err) {
        throw new ValidationError(
          err instanceof Error ? err.message : 'لا يمكن كتم هذه الفئة',
        );
      }
    }

    if (isUnmuteableCategory(input.category) && input.inAppEnabled === false) {
      throw new ValidationError('لا يمكن كتم إشعارات الطوارئ أو طلبات النجدة');
    }

    if (input.quietHoursEnabled) {
      if (!input.quietHoursFrom || !input.quietHoursTo) {
        throw new ValidationError('يجب تحديد بداية ونهاية ساعات الهدوء');
      }
      if (
        parseTimeToMinutes(input.quietHoursFrom) === null ||
        parseTimeToMinutes(input.quietHoursTo) === null
      ) {
        throw new ValidationError('صيغة ساعات الهدوء غير صالحة (HH:mm)');
      }
    }

    // Push is never claimed as configured
    const pushEnabled = false;

    return prisma.notificationPreference.upsert({
      where: {
        userId_category: { userId: user.id, category: input.category },
      },
      create: {
        userId: user.id,
        category: input.category,
        inAppEnabled: input.inAppEnabled ?? true,
        socketEnabled: input.socketEnabled ?? true,
        pushEnabled,
        soundEnabled: input.soundEnabled ?? false,
        quietHoursEnabled: input.quietHoursEnabled ?? false,
        quietHoursFrom: input.quietHoursFrom ?? null,
        quietHoursTo: input.quietHoursTo ?? null,
        minimumPriority: input.minimumPriority ?? NotificationPriority.LOW,
      },
      update: {
        ...(input.inAppEnabled !== undefined ? { inAppEnabled: input.inAppEnabled } : {}),
        ...(input.socketEnabled !== undefined ? { socketEnabled: input.socketEnabled } : {}),
        pushEnabled,
        ...(input.soundEnabled !== undefined ? { soundEnabled: input.soundEnabled } : {}),
        ...(input.quietHoursEnabled !== undefined
          ? { quietHoursEnabled: input.quietHoursEnabled }
          : {}),
        ...(input.quietHoursFrom !== undefined ? { quietHoursFrom: input.quietHoursFrom } : {}),
        ...(input.quietHoursTo !== undefined ? { quietHoursTo: input.quietHoursTo } : {}),
        ...(input.minimumPriority !== undefined
          ? { minimumPriority: input.minimumPriority }
          : {}),
      },
    });
  }

  async getByCategory(user: AuthenticatedUser, category: NotificationCategory) {
    const pref = await prisma.notificationPreference.findUnique({
      where: { userId_category: { userId: user.id, category } },
    });
    if (!pref) throw new NotFoundError('تفضيل الإشعار غير موجود');
    return pref;
  }
}

export const notificationPreferenceService = new NotificationPreferenceService();

export type PreferenceCreateData = Prisma.NotificationPreferenceCreateInput;
