import { apiRequest } from '@/shared/api/client';
import { readAuthSession } from '@/shared/auth';

import type { ModelId } from '../constants';
import type { ResponseLanguage } from './requestReply';
import { useChatStore, type ChatMessage, type Conversation, type ConversationProject } from '../store/chatStore';

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
};

type ConversationsResponse = { conversations: ConversationResponse[] };
type ConversationDetailResponse = {
  conversation: ConversationResponse;
  messages: MessageResponse[];
};

type UpdateConversationInput = Partial<{
  title: string;
  model: ModelId;
  responseLanguage: ResponseLanguage;
  pinned: boolean;
}>;

function toMessage(message: MessageResponse): ChatMessage {
  return {
    id: message.clientMessageId ?? message.id,
    role: message.role,
    text: message.content,
    at: Date.parse(message.createdAt),
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
    toConversation(response.conversation, existing, response.messages.map(toMessage)),
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
  });
}