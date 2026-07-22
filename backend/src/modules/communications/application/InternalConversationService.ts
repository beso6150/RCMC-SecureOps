import {
  ConversationParticipantRole,
  ConversationType,
  Prisma,
} from '@prisma/client';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/errors/index.js';
import { prisma } from '../../../shared/database/prisma.js';
import {
  emitToConversation,
  emitToUser,
} from '../../../shared/realtime/socketServer.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { AuthenticatedUser } from '../../identity/domain/types.js';
import { nextConversationNumber } from './conversationNumbering.js';
import { assertConversationParticipant } from './conversationAccess.js';
import { countUnreadConversations } from './conversationUnread.js';

const conversationInclude = {
  participants: {
    where: { leftAt: null },
    include: {
      user: { select: { id: true, fullName: true, employeeNumber: true } },
    },
  },
  createdBy: { select: { id: true, fullName: true, employeeNumber: true } },
} satisfies Prisma.InternalConversationInclude;

export interface CreateConversationInput {
  title?: string | null;
  conversationType: ConversationType;
  entityType?: string | null;
  entityId?: string | null;
  participantUserIds: string[];
}

class InternalConversationService {
  private assertRead(user: AuthenticatedUser): void {
    if (
      !user.permissions.includes(PermissionCodes.COMMUNICATIONS_READ) &&
      !user.permissions.includes(PermissionCodes.NOTIFICATIONS_READ)
    ) {
      throw new ForbiddenError('Missing permission to read communications');
    }
  }

  private assertCreate(user: AuthenticatedUser): void {
    if (
      !user.permissions.includes(PermissionCodes.COMMUNICATIONS_CREATE) &&
      !user.permissions.includes(PermissionCodes.COMMUNICATIONS_SEND)
    ) {
      throw new ForbiddenError('Missing permission to create conversations');
    }
  }

  async listMine(user: AuthenticatedUser, page = 1, pageSize = 20) {
    this.assertRead(user);
    const take = Math.min(pageSize, 100);
    const skip = (page - 1) * take;

    const where: Prisma.InternalConversationWhereInput = {
      deletedAt: null,
      participants: { some: { userId: user.id, leftAt: null } },
    };

    const [rows, total] = await Promise.all([
      prisma.internalConversation.findMany({
        where,
        include: conversationInclude,
        orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      prisma.internalConversation.count({ where }),
    ]);

    return { data: rows, meta: { page, pageSize: take, total } };
  }

  async getById(user: AuthenticatedUser, id: string) {
    this.assertRead(user);
    const conversation = await prisma.internalConversation.findFirst({
      where: { id, deletedAt: null },
      include: conversationInclude,
    });
    if (!conversation) throw new NotFoundError('المحادثة غير موجودة');

    assertConversationParticipant(
      conversation.participants.map((p) => p.userId),
      user.id,
    );

    return conversation;
  }

  async create(user: AuthenticatedUser, input: CreateConversationInput) {
    this.assertCreate(user);

    const participantIds = Array.from(
      new Set([user.id, ...input.participantUserIds.filter(Boolean)]),
    );
    if (participantIds.length < 2 && input.conversationType === ConversationType.DIRECT) {
      throw new ValidationError('المحادثة المباشرة تتطلب مشاركاً آخر');
    }

    const conversationNumber = await nextConversationNumber();

    const conversation = await prisma.internalConversation.create({
      data: {
        conversationNumber,
        title: input.title?.trim() || null,
        conversationType: input.conversationType,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        createdById: user.id,
        participants: {
          create: participantIds.map((uid, index) => ({
            userId: uid,
            role:
              uid === user.id
                ? ConversationParticipantRole.OWNER
                : index === 0
                  ? ConversationParticipantRole.MEMBER
                  : ConversationParticipantRole.MEMBER,
          })),
        },
      },
      include: conversationInclude,
    });

    for (const uid of participantIds) {
      emitToUser(uid, 'conversation:created', conversation);
    }
    emitToConversation(conversation.id, 'conversation:updated', conversation);

    return conversation;
  }

  async close(user: AuthenticatedUser, id: string) {
    const conversation = await this.getById(user, id);
    if (conversation.isClosed) return conversation;

    const canManage =
      user.permissions.includes(PermissionCodes.COMMUNICATIONS_MANAGE) ||
      conversation.createdById === user.id;

    if (!canManage) {
      throw new ForbiddenError('لا يمكنك إغلاق هذه المحادثة');
    }

    const updated = await prisma.internalConversation.update({
      where: { id },
      data: {
        isClosed: true,
        closedAt: new Date(),
        closedById: user.id,
      },
      include: conversationInclude,
    });

    emitToConversation(id, 'conversation:closed', updated);
    return updated;
  }

  async markRead(user: AuthenticatedUser, conversationId: string) {
    await this.getById(user, conversationId);
    await prisma.conversationParticipant.updateMany({
      where: { conversationId, userId: user.id, leftAt: null },
      data: { lastReadAt: new Date() },
    });
    const count = await countUnreadConversations(user.id);
    emitToUser(user.id, 'communications:unread-count', { count });
    return { ok: true, count };
  }

  /**
   * Conversations where lastMessageAt > participant.lastReadAt (or never read).
   */
  async unreadCount(user: AuthenticatedUser): Promise<{ count: number }> {
    this.assertRead(user);
    const count = await countUnreadConversations(user.id);
    return { count };
  }
}

export const internalConversationService = new InternalConversationService();

export { isConversationUnread } from './conversationUnread.js';
