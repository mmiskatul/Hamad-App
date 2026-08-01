import { apiRequest } from '@/shared/api/client';
import type { ModelId } from '../constants';

export type ResponseLanguage = 'auto' | 'en' | 'ar' | 'both';

type RequestReplyOptions = {
  conversationId: string;
  clientMessageId: string;
  modelId: ModelId;
  responseLanguage?: ResponseLanguage;
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
  const response = await apiRequest<MessageResponse>(
    `/conversations/${encodeURIComponent(options.conversationId)}/messages`,
    {
      method: 'POST',
      authenticated: true,
      signal: options.signal,
      timeoutMs: 75_000,
      body: JSON.stringify({
        clientMessageId: options.clientMessageId,
        content: prompt,
        modelId: options.modelId,
        responseLanguage: options.responseLanguage ?? 'auto',
      }),
    },
  );
  return response.assistantMessage.content;
}
