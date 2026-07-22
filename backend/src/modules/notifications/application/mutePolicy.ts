import { NotificationCategory, NotificationPriority } from '@prisma/client';

/** Categories that users cannot mute via preferences. */
export const UNMUTEABLE_CATEGORIES: ReadonlySet<NotificationCategory> = new Set([
  NotificationCategory.SOS,
  NotificationCategory.EMERGENCY,
]);

export function isUnmuteableCategory(category: NotificationCategory | null | undefined): boolean {
  if (!category) return false;
  return UNMUTEABLE_CATEGORIES.has(category);
}

/**
 * Preference mute is ignored for CRITICAL priority, SOS/EMERGENCY categories,
 * and assigned CCTV referrals (action-required referral notifications).
 */
export function cannotMuteNotification(input: {
  category?: NotificationCategory | null;
  priority?: NotificationPriority | null;
  kind?: string | null;
  entityType?: string | null;
}): boolean {
  if (input.priority === NotificationPriority.CRITICAL) return true;
  if (isUnmuteableCategory(input.category)) return true;
  if (
    input.category === NotificationCategory.CCTV_REFERRAL &&
    (input.kind === 'ACTION_REQUIRED' || input.entityType === 'SecurityReferral')
  ) {
    return true;
  }
  return false;
}

export function assertCanDisableCategory(category: NotificationCategory): void {
  if (isUnmuteableCategory(category)) {
    throw new Error('لا يمكن كتم إشعارات الطوارئ أو طلبات النجدة');
  }
}
