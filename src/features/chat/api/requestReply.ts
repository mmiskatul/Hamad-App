import { ApiError, apiRequest } from '@/shared/api/client';
import type { ModelId } from '../constants';
import type { ConversationProject } from '../store/chatStore';

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
  };
};

/**
 * Sends the prompt to the backend-owned conversation. The backend chooses the
 * provider, checks availability, rebuilds shared context, and stores both turns.
 */
export async function requestReply(
  prompt: string,
  options: RequestReplyOptions,
): Promise<string> {
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

  try {
    return (await request()).assistantMessage.content;
  } catch (error) {
    // The endpoint is idempotent by clientMessageId. Retrying once is safe even
    // if the first response was lost after Fastify stored the assistant reply.
    if (isTransientReplyError(error) && !options.signal?.aborted) {
      return (await request()).assistantMessage.content;
    }
    throw error;
  }
}

function isTransientReplyError(error: unknown): error is ApiError {
  return error instanceof ApiError && [0, 408, 502].includes(error.status);
}
