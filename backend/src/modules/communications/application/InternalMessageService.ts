import { InternalMessageType, Prisma } from '@prisma/client';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/index.js';
import { prisma } from '../../../shared/database/prisma.js';
import {
  emitToConversation,
  emitToUser,
} from '../../../shared/realtime/socketServer.js';
import { PermissionCodes } from '../../identity/domain/permissionCodes.js';
import { AuthenticatedUser } from '../../identity/domain/types.js';
import { assertConversationParticipant } from './conversationAccess.js';
import {
  readMessageAttachmentFile,
  saveMessageAttachmentFile,
} from './MessageAttachmentStorage.js';
import {
  assertSafePlainText,
  sanitizeMessageContent,
} from './sanitizeMessageContent.js';
import { countUnreadConversations } from './conversationUnread.js';

const messageInclude = {
  sender: { select: { id: true, fullName: true, employeeNumber: true } },
  attachments: { where: { deletedAt: null } },
} satisfies Prisma.InternalMessageInclude;

export interface SendMessageInput {
  content?: string | null;
  messageType?: InternalMessageType;
  replyToMessageId?: string | null;
}

export interface SoftDeleteResult {
  id: string;
  isDeleted: true;
  content: null;
}

class InternalMessageService {
  private async loadConversationForUser(user: AuthenticatedUser, conversationId: string) {
    const conversation = await prisma.internalConversation.findFirst({
      where: { id: conversationId, deletedAt: null },
      include: {
        participants: { where: { leftAt: null }, select: { userId: true } },
      },
    });
    if (!conversation) throw new NotFoundError('المحادثة غير موجودة');
    if (conversation.isClosed) {
      throw new ValidationError('المحادثة مغلقة');
    }
    assertConversationParticipant(
      conversation.participants.map((p) => p.userId),
      user.id,
    );
    return conversation;
  }

  async list(user: AuthenticatedUser, conversationId: string, page = 1, pageSize = 50) {
    await this.loadConversationForUser(user, conversationId);
    const take = Math.min(pageSize, 100);
    const skip = (page - 1) * take;

    const where: Prisma.InternalMessageWhereInput = { conversationId };
    const [rows, total] = await Promise.all([
      prisma.internalMessage.findMany({
        where,
        include: messageInclude,
        orderBy: { createdAt: 'asc' },
        skip,
        take,
      }),
      prisma.internalMessage.count({ where }),
    ]);

    // Soft-deleted messages expose placeholder content only
    const data = rows.map((m) =>
      m.isDeleted
        ? { ...m, content: null, attachments: [] }
        : m,
    );

    return { data, meta: { page, pageSize: take, total } };
  }

  async send(user: AuthenticatedUser, conversationId: string, input: SendMessageInput) {
    if (
      !user.permissions.includes(PermissionCodes.COMMUNICATIONS_SEND) &&
      !user.permissions.includes(PermissionCodes.COMMUNICATIONS_CREATE)
    ) {
      throw new ForbiddenError('Missing permission to send messages');
    }

    const conversation = await this.loadConversationForUser(user, conversationId);

    let content: string | null = null;
    const messageType = input.messageType ?? InternalMessageType.TEXT;
    if (messageType === InternalMessageType.TEXT || input.content) {
      try {
        content = assertSafePlainText(input.content ?? '', 10000);
      } catch (err) {
        throw new ValidationError(
          err instanceof Error ? err.message : 'محتوى الرسالة غير صالح',
        );
      }
    }

    if (input.replyToMessageId) {
      const reply = await prisma.internalMessage.findFirst({
        where: { id: input.replyToMessageId, conversationId, isDeleted: false },
      });
      if (!reply) throw new ValidationError('الرسالة المراد الرد عليها غير موجودة');
    }

    const message = await prisma.internalMessage.create({
      data: {
        conversationId,
        senderId: user.id,
        messageType,
        content,
        replyToMessageId: input.replyToMessageId ?? null,
      },
      include: messageInclude,
    });

    await prisma.internalConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    emitToConversation(conversationId, 'message:new', message);
    for (const p of conversation.participants) {
      if (p.userId !== user.id) {
        emitToUser(p.userId, 'message:new', {
          conversationId,
          message,
        });
        void countUnreadConversations(p.userId)
          .then((count) => {
            emitToUser(p.userId, 'communications:unread-count', { count });
          })
          .catch(() => {
            // best-effort socket
          });
      }
    }

    return message;
  }

  async softDelete(user: AuthenticatedUser, messageId: string): Promise<SoftDeleteResult> {
    const message = await prisma.internalMessage.findFirst({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: { where: { leftAt: null }, select: { userId: true } },
          },
        },
      },
    });
    if (!message || message.conversation.deletedAt) {
      throw new NotFoundError('الرسالة غير موجودة');
    }

    assertConversationParticipant(
      message.conversation.participants.map((p) => p.userId),
      user.id,
    );

    const canDelete =
      message.senderId === user.id ||
      user.permissions.includes(PermissionCodes.COMMUNICATIONS_DELETE) ||
      user.permissions.includes(PermissionCodes.COMMUNICATIONS_MANAGE);

    if (!canDelete) {
      throw new ForbiddenError('لا يمكنك حذف هذه الرسالة');
    }

    if (message.isDeleted) {
      return { id: message.id, isDeleted: true, content: null };
    }

    await prisma.internalMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedById: user.id,
        content: null,
      },
    });

    const payload: SoftDeleteResult = { id: messageId, isDeleted: true, content: null };
    emitToConversation(message.conversationId, 'message:deleted', payload);
    return payload;
  }

  async addAttachment(
    user: AuthenticatedUser,
    messageId: string,
    file: {
      originalFileName: string;
      mimeType: string;
      contentBase64: string;
    },
  ) {
    if (!user.permissions.includes(PermissionCodes.COMMUNICATIONS_ATTACHMENTS)) {
      throw new ForbiddenError('Missing permission to attach files');
    }

    const message = await prisma.internalMessage.findFirst({
      where: { id: messageId, isDeleted: false },
      include: {
        conversation: {
          include: {
            participants: { where: { leftAt: null }, select: { userId: true } },
          },
        },
      },
    });
    if (!message) throw new NotFoundError('الرسالة غير موجودة');
    assertConversationParticipant(
      message.conversation.participants.map((p) => p.userId),
      user.id,
    );
    if (message.senderId !== user.id) {
      throw new ForbiddenError('يمكن لمُرسل الرسالة فقط إرفاق الملفات');
    }

    const saved = await saveMessageAttachmentFile({
      conversationId: message.conversationId,
      ...file,
    });

    const attachment = await prisma.messageAttachment.create({
      data: {
        messageId,
        fileName: saved.fileName,
        originalFileName: saved.originalFileName,
        mimeType: saved.mimeType,
        fileSize: saved.fileSize,
        storagePath: saved.storagePath,
        uploadedById: user.id,
      },
    });

    emitToConversation(message.conversationId, 'message:attachment', {
      messageId,
      attachment,
    });

    return attachment;
  }

  /** Nested: attach to a message that belongs to the conversation. */
  async addAttachmentToConversation(
    user: AuthenticatedUser,
    conversationId: string,
    input: {
      messageId: string;
      originalFileName: string;
      mimeType: string;
      contentBase64: string;
    },
  ) {
    await this.loadConversationForUser(user, conversationId);
    const message = await prisma.internalMessage.findFirst({
      where: { id: input.messageId, conversationId, isDeleted: false },
      select: { id: true },
    });
    if (!message) {
      throw new NotFoundError('الرسالة غير موجودة في هذه المحادثة');
    }
    return this.addAttachment(user, input.messageId, {
      originalFileName: input.originalFileName,
      mimeType: input.mimeType,
      contentBase64: input.contentBase64,
    });
  }

  async downloadAttachment(user: AuthenticatedUser, attachmentId: string) {
    const attachment = await prisma.messageAttachment.findFirst({
      where: { id: attachmentId, deletedAt: null },
      include: {
        message: {
          include: {
            conversation: {
              include: {
                participants: { where: { leftAt: null }, select: { userId: true } },
              },
            },
          },
        },
      },
    });
    if (!attachment) throw new NotFoundError('المرفق غير موجود');
    assertConversationParticipant(
      attachment.message.conversation.participants.map((p) => p.userId),
      user.id,
    );

    const buffer = await readMessageAttachmentFile(attachment.storagePath);
    return { attachment, buffer };
  }
}

export const internalMessageService = new InternalMessageService();

/** Re-export for tests */
export { sanitizeMessageContent };
