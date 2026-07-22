export type ConversationType =
  | 'DIRECT'
  | 'GROUP'
  | 'INCIDENT'
  | 'REFERRAL'
  | 'SHIFT'
  | 'OPERATIONS'
  | 'TASK';

export type ConversationParticipantRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export type InternalMessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'DOCUMENT'
  | 'SYSTEM'
  | 'STATUS_UPDATE'
  | 'LOCATION'
  | 'TASK_REFERENCE';

export interface CommUserRef {
  id: string;
  fullName: string;
  employeeNumber: string;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  role: ConversationParticipantRole;
  joinedAt: string;
  leftAt: string | null;
  lastReadAt: string | null;
  isMuted: boolean;
  user?: CommUserRef;
}

export interface InternalConversation {
  id: string;
  conversationNumber: string;
  title: string | null;
  conversationType: ConversationType;
  entityType: string | null;
  entityId: string | null;
  createdById: string;
  isClosed: boolean;
  closedAt: string | null;
  closedById: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
  createdBy?: CommUserRef;
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

export interface InternalMessage {
  id: string;
  conversationId: string;
  senderId: string;
  messageType: InternalMessageType;
  content: string | null;
  replyToMessageId: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  sender?: CommUserRef;
  attachments?: MessageAttachment[];
}

export interface ListConversationsParams {
  page?: number;
  pageSize?: number;
}

export interface ListMessagesParams {
  page?: number;
  pageSize?: number;
}

export interface CreateConversationPayload {
  title?: string | null;
  conversationType: ConversationType;
  entityType?: string | null;
  entityId?: string | null;
  participantUserIds: string[];
}

export interface SendMessagePayload {
  content?: string;
  messageType?: InternalMessageType;
  replyToMessageId?: string | null;
}

export interface AttachmentUploadPayload {
  originalFileName: string;
  mimeType: string;
  contentBase64: string;
}
