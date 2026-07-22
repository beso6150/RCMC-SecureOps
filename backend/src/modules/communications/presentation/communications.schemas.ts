import { ConversationType, InternalMessageType, OperationalTaskType, TaskPriority, TaskStatus } from '@prisma/client';
import { z } from 'zod';

export const listConversationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const createConversationSchema = z.object({
  title: z.string().trim().max(200).nullable().optional(),
  conversationType: z.nativeEnum(ConversationType),
  entityType: z.string().trim().max(100).nullable().optional(),
  entityId: z.string().uuid().nullable().optional(),
  participantUserIds: z.array(z.string().uuid()).min(1).max(50),
});

export const conversationIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const messageIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const attachmentIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listMessagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().max(10000).optional(),
  messageType: z.nativeEnum(InternalMessageType).optional(),
  replyToMessageId: z.string().uuid().nullable().optional(),
});

export const attachmentUploadSchema = z.object({
  originalFileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  contentBase64: z.string().min(1),
});

export const conversationAttachmentUploadSchema = attachmentUploadSchema.extend({
  messageId: z.string().uuid(),
});

export type CreateConversationBody = z.infer<typeof createConversationSchema>;
export type SendMessageBody = z.infer<typeof sendMessageSchema>;

// Re-export task enums used in shared schemas sometimes
export { TaskStatus, TaskPriority, OperationalTaskType };
