import { apiRequest, isTransientNetworkError } from '@/shared/api/client';
import type { ModelId } from '../constants';
import type { ConversationProject, ChatAttachment } from '../store/chatStore';
import { toAttachment, type AttachmentResponse } from './conversationApi';

export type ResponseLanguage = 'auto' | 'en' | 'ar' | 'both';

type RequestReplyOptions = {
  conversationId: string;
  clientMessageId: string;
  modelId: ModelId;
  responseLanguage?: ResponseLanguage;
  project?: ConversationProject | null;
  signal?: AbortSignal;
};

type MessageResponse = {
  assistantMessage: {
    id: string;
    content: string;
    modelId: ModelId;
    provider: string;
    language: 'en' | 'ar' | 'mixed';
    createdAt: string;
    generatedImages?: AttachmentResponse[];
  };
};

export type AssistantReply = {
  id: string;
  text: string;
  generatedImages: ChatAttachment[];
};

/**
 * Sends the prompt to the backend-owned conversation. The backend chooses the
 * provider, checks availability, rebuilds shared context, and stores both turns.
 *
 * Returns the server-side assistant message id (used by the store as the
 * message id so the reveal animation and feedback map survive the follow-up
 * `refreshConversation`), the rendered text, and the generated images mapped
 * through the same `toAttachment` helper the conversation API uses — the URL
 * is the one `<Image>` already knows how to fetch with the auth headers.
 */
export async function requestReply(
  prompt: string,
  options: RequestReplyOptions,
): Promise<AssistantReply> {
  const request = () => apiRequest<MessageResponse>(
      `/conversations/${encodeURIComponent(options.conversationId)}/messages`,
      {
        method: 'POST',
        authenticated: true,
        signal: options.signal,
        timeoutMs: 195_000,
        body: JSON.stringify({
          clientMessageId: options.clientMessageId,
          content: prompt,
          modelId: options.modelId,
          responseLanguage: options.responseLanguage ?? 'auto',
          ...(options.project ? { project: options.project } : {}),
        }),
      },
    );

  const toReply = (response: MessageResponse): AssistantReply => ({
    id: response.assistantMessage.id,
    text: response.assistantMessage.content,
    generatedImages: (response.assistantMessage.generatedImages ?? []).map((image) =>
      toAttachment(options.conversationId, image),
    ),
  });

  try {
    return toReply(await request());
  } catch (error) {
    // Idempotent by clientMessageId — a retry is safe even if the first
    // response was lost after Fastify stored the assistant reply.
    if (isTransientNetworkError(error) && !options.signal?.aborted) {
      return toReply(await request());
    }
    throw error;
  }
}
