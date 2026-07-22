import { prisma } from '../../../shared/database/prisma.js';

/** Pure helper — conversation has unread activity for a participant. */
export function isConversationUnread(
  lastMessageAt: Date | null | undefined,
  lastReadAt: Date | null | undefined,
): boolean {
  if (!lastMessageAt) return false;
  if (!lastReadAt) return true;
  return lastMessageAt.getTime() > lastReadAt.getTime();
}

/** Count conversations with unread messages for a user. */
export async function countUnreadConversations(userId: string): Promise<number> {
  const rows = await prisma.conversationParticipant.findMany({
    where: {
      userId,
      leftAt: null,
      conversation: { deletedAt: null },
    },
    select: {
      lastReadAt: true,
      conversation: { select: { lastMessageAt: true } },
    },
  });

  return rows.filter((row) =>
    isConversationUnread(row.conversation.lastMessageAt, row.lastReadAt),
  ).length;
}
