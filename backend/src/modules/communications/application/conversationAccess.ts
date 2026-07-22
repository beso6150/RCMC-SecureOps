import { ForbiddenError } from '../../../shared/errors/index.js';

/**
 * IDOR guard — participant list must include the requesting user.
 * Pure helper for unit tests + service use.
 */
export function assertConversationParticipant(
  participantUserIds: string[],
  userId: string,
): void {
  if (!participantUserIds.includes(userId)) {
    throw new ForbiddenError('غير مصرح لك بالوصول إلى هذه المحادثة');
  }
}

export function isActiveParticipant(
  participants: Array<{ userId: string; leftAt?: Date | null }>,
  userId: string,
): boolean {
  return participants.some((p) => p.userId === userId && !p.leftAt);
}
