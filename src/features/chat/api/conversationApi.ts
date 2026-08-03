import { apiRequest, apiUrl } from '@/shared/api/client';
import { readAuthSession } from '@/shared/auth';
import { Platform } from 'react-native';

import type { ModelId } from '../constants';
import type { ResponseLanguage } from './requestReply';
import { useChatStore, type ChatAttachment, type ChatMessage, type Conversation, type ConversationProject } from '../store/chatStore';

export type PickedAttachment = { uri: string; name: string; mimeType: string };

type AttachmentResponse = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

type ConversationResponse = {
  id: string;
  title: string;
  modelId: ModelId;
  responseLanguage: ResponseLanguage;
  pinned: boolean;
  pinnedAt: string | null;
  project: ConversationProject | null;
  createdAt: string;
  updatedAt: string;
};

type MessageResponse = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  clientMessageId?: string;
  createdAt: string;
  generatedImages?: AttachmentResponse[];
};

type ConversationsResponse = { conversations: ConversationResponse[] };
type ConversationDetailResponse = {
  conversation: ConversationResponse;
  messages: MessageResponse[];
};
type AttachmentsResponse = { attachments: AttachmentResponse[] };

type UpdateConversationInput = Partial<{
  title: string;
  model: ModelId;
  responseLanguage: ResponseLanguage;
  pinned: boolean;
}>;

function toMessage(conversationId: string, message: MessageResponse): ChatMessage {
  return {
    id: message.clientMessageId ?? message.id,
    role: message.role,
    text: message.content,
    at: Date.parse(message.createdAt),
    ...(message.generatedImages?.length
      ? { generatedImages: message.generatedImages.map((image) => toAttachment(conversationId, image)) }
      : {}),
  };
}

function toConversation(
  conversation: ConversationResponse,
  existing?: Conversation,
  messages?: ChatMessage[],
): Conversation {
  return {
    id: conversation.id,
    title: conversation.title,
    model: conversation.modelId,
    updatedAt: Date.parse(conversation.updatedAt),
    pinned: conversation.pinned,
    pinnedAt: conversation.pinnedAt ? Date.parse(conversation.pinnedAt) : undefined,
    project: conversation.project,
    messages: messages ?? existing?.messages ?? [],
    attachments: existing?.attachments ?? [],
  };
}

function replaceConversationInStore(nextConversation: Conversation): Conversation {
  useChatStore.setState((state) => {
    const conversations = [
      nextConversation,
      ...state.conversations.filter((conversation) => conversation.id !== nextConversation.id),
    ];

    return {
      ...state,
      conversations,
      model: state.activeId === nextConversation.id ? nextConversation.model : state.model,
    };
  });

  return nextConversation;
}

export async function refreshConversations(): Promise<Conversation[] | null> {
  const session = await readAuthSession();
  if (!session) return null;

  const response = await apiRequest<ConversationsResponse>('/conversations', { authenticated: true });
  const serverConversations = response.conversations;

  useChatStore.setState((state) => {
    const existingById = new Map(state.conversations.map((conversation) => [conversation.id, conversation]));
    const conversations = serverConversations.map((conversation) =>
      toConversation(conversation, existingById.get(conversation.id)),
    );
    const conversationIds = new Set(conversations.map((conversation) => conversation.id));
    const activeId = state.activeId && conversationIds.has(state.activeId) ? state.activeId : null;
    const activeConversation = activeId
      ? conversations.find((conversation) => conversation.id === activeId) ?? null
      : null;

    return {
      ...state,
      conversations,
      activeId,
      thinkingFor: activeId ? state.thinkingFor : null,
      streamingId: activeId ? state.streamingId : null,
      model: activeConversation?.model ?? state.model,
    };
  });

  return useChatStore.getState().conversations;
}

export async function refreshConversation(conversationId: string): Promise<Conversation | null> {
  const session = await readAuthSession();
  if (!session) return null;

  const response = await apiRequest<ConversationDetailResponse>(
    `/conversations/${encodeURIComponent(conversationId)}`,
    { authenticated: true },
  );
  const existing = useChatStore.getState().conversations.find(
    (conversation) => conversation.id === conversationId,
  );
  return replaceConversationInStore(
    toConversation(
      response.conversation,
      existing,
      response.messages.map((message) => toMessage(conversationId, message)),
    ),
  );
}

export async function updateConversation(
  conversationId: string,
  patch: UpdateConversationInput,
): Promise<Conversation> {
  const response = await apiRequest<ConversationResponse>(
    `/conversations/${encodeURIComponent(conversationId)}`,
    {
      method: 'PATCH',
      authenticated: true,
      body: JSON.stringify({
        ...(patch.title === undefined ? {} : { title: patch.title }),
        ...(patch.model === undefined ? {} : { modelId: patch.model }),
        ...(patch.responseLanguage === undefined
          ? {}
          : { responseLanguage: patch.responseLanguage }),
        ...(patch.pinned === undefined ? {} : { pinned: patch.pinned }),
      }),
    },
  );
  const existing = useChatStore.getState().conversations.find(
    (conversation) => conversation.id === conversationId,
  );
  return replaceConversationInStore(toConversation(response, existing));
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await apiRequest<void>(`/conversations/${encodeURIComponent(conversationId)}`, {
    method: 'DELETE',
    authenticated: true,
    // React Native's Android fetch transport can leave a bodyless DELETE open
    // until the client timeout. Sending a valid empty JSON object gives the
    // request a concrete payload and lets Fastify complete it immediately.
    body: JSON.stringify({}),
  });
}

export async function createConversationForAttachment(conversation: Conversation): Promise<Conversation> {
  const response = await apiRequest<ConversationResponse>('/conversations', {
    method: 'POST',
    authenticated: true,
    body: JSON.stringify({
      id: conversation.id,
      title: conversation.title,
      modelId: conversation.model,
      responseLanguage: 'auto',
      ...(conversation.project ? { project: conversation.project } : {}),
    }),
  });
  return replaceConversationInStore(toConversation(response, conversation));
}

export async function uploadConversationAttachment(
  conversationId: string,
  file: PickedAttachment,
): Promise<ChatAttachment> {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await fetch(file.uri).then((response) => response.blob());
    form.append('file', blob, file.name);
  } else {
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  }
  const response = await apiRequest<{ attachment: AttachmentResponse }>(
    `/conversations/${encodeURIComponent(conversationId)}/attachments`,
    { method: 'POST', authenticated: true, body: form, timeoutMs: 60_000 },
  );
  const attachment = toAttachment(conversationId, response.attachment);
  useChatStore.getState().addAttachment(conversationId, attachment);
  return attachment;
}

export async function refreshConversationAttachments(conversationId: string): Promise<ChatAttachment[]> {
  const response = await apiRequest<AttachmentsResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/attachments`,
    { authenticated: true },
  );
  const attachments = response.attachments.map((attachment) => toAttachment(conversationId, attachment));
  useChatStore.getState().replaceAttachments(conversationId, attachments);
  return attachments;
}

export async function deleteConversationAttachment(
  conversationId: string,
  attachmentId: string,
): Promise<void> {
  await apiRequest<void>(
    `/conversations/${encodeURIComponent(conversationId)}/attachments/${encodeURIComponent(attachmentId)}`,
    { method: 'DELETE', authenticated: true, body: JSON.stringify({}) },
  );
  useChatStore.getState().removeAttachment(conversationId, attachmentId);
}

export function attachmentContentUrl(conversationId: string, attachmentId: string): string {
  return apiUrl(
    `/conversations/${encodeURIComponent(conversationId)}/attachments/${encodeURIComponent(attachmentId)}/content`,
  );
}

function toAttachment(conversationId: string, attachment: AttachmentResponse): ChatAttachment {
  return {
    id: attachment.id,
    name: attachment.name,
    mimeType: attachment.mimeType,
    size: attachment.size,
    at: Date.parse(attachment.createdAt),
    uri: attachmentContentUrl(conversationId, attachment.id),
  };
}
