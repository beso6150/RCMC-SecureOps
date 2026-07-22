import { apiClient } from './client';
import type { ApiResponse } from '../types/auth';
import type { PaginatedResponse } from '../types/director';
import type {
  AttachmentUploadPayload,
  CreateConversationPayload,
  InternalConversation,
  InternalMessage,
  ListConversationsParams,
  ListMessagesParams,
  MessageAttachment,
  SendMessagePayload,
} from '../types/communications';

export const COMMUNICATIONS_QUERY_KEYS = {
  all: ['communications'] as const,
  conversations: (params?: ListConversationsParams) =>
    ['communications', 'conversations', params] as const,
  conversation: (id: string) => ['communications', 'conversation', id] as const,
  messages: (id: string, params?: ListMessagesParams) =>
    ['communications', 'messages', id, params] as const,
};

export async function listConversations(
  params: ListConversationsParams = {},
): Promise<PaginatedResponse<InternalConversation>> {
  const { data } = await apiClient.get<
    ApiResponse<InternalConversation[]> & {
      meta: PaginatedResponse<InternalConversation>['meta'];
    }
  >('/communications/conversations', { params });
  return { data: data.data, meta: data.meta };
}

export async function getConversation(id: string): Promise<InternalConversation> {
  const { data } = await apiClient.get<ApiResponse<InternalConversation>>(
    `/communications/conversations/${id}`,
  );
  return data.data;
}

export async function createConversation(
  payload: CreateConversationPayload,
): Promise<InternalConversation> {
  const { data } = await apiClient.post<ApiResponse<InternalConversation>>(
    '/communications/conversations',
    payload,
  );
  return data.data;
}

export async function closeConversation(id: string): Promise<InternalConversation> {
  const { data } = await apiClient.post<ApiResponse<InternalConversation>>(
    `/communications/conversations/${id}/close`,
  );
  return data.data;
}

export async function markConversationRead(id: string): Promise<{ ok: boolean }> {
  const { data } = await apiClient.post<ApiResponse<{ ok: boolean }>>(
    `/communications/conversations/${id}/read`,
  );
  return data.data;
}

export async function listMessages(
  conversationId: string,
  params: ListMessagesParams = {},
): Promise<PaginatedResponse<InternalMessage>> {
  const { data } = await apiClient.get<
    ApiResponse<InternalMessage[]> & { meta: PaginatedResponse<InternalMessage>['meta'] }
  >(`/communications/conversations/${conversationId}/messages`, { params });
  return { data: data.data, meta: data.meta };
}

export async function sendMessage(
  conversationId: string,
  payload: SendMessagePayload,
): Promise<InternalMessage> {
  const { data } = await apiClient.post<ApiResponse<InternalMessage>>(
    `/communications/conversations/${conversationId}/messages`,
    payload,
  );
  return data.data;
}

export async function softDeleteMessage(id: string): Promise<{ id: string; isDeleted: true }> {
  const { data } = await apiClient.delete<ApiResponse<{ id: string; isDeleted: true }>>(
    `/communications/messages/${id}`,
  );
  return data.data;
}

export async function addMessageAttachment(
  messageId: string,
  payload: AttachmentUploadPayload,
): Promise<MessageAttachment> {
  const { data } = await apiClient.post<ApiResponse<MessageAttachment>>(
    `/communications/messages/${messageId}/attachments`,
    payload,
  );
  return data.data;
}

export async function downloadMessageAttachment(id: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/communications/attachments/${id}`, {
    responseType: 'blob',
  });
  return data;
}

/** Client-side unread estimate — backend has no /communications/unread-count. */
export function countUnreadConversations(
  conversations: InternalConversation[],
  userId: string,
): number {
  return conversations.filter((c) => {
    if (c.isClosed || !c.lastMessageAt) return false;
    const me = c.participants.find((p) => p.userId === userId && !p.leftAt);
    if (!me) return false;
    if (!me.lastReadAt) return true;
    return new Date(c.lastMessageAt).getTime() > new Date(me.lastReadAt).getTime();
  }).length;
}
