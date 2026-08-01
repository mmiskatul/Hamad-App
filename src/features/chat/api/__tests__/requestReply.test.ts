import { apiRequest } from '@/shared/api/client';
import { requestReply } from '../requestReply';

jest.mock('@/shared/api/client', () => ({ apiRequest: jest.fn() }));

const apiRequestMock = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe('requestReply', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends the selected model, language and stable message id to the backend', async () => {
    apiRequestMock.mockResolvedValue({
      assistantMessage: {
        id: 'reply-1',
        content: 'Backend reply',
        modelId: 'deepseek',
        provider: 'DeepSeek',
        language: 'en',
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    });

    await expect(requestReply('hello', {
      conversationId: 'conversation-1',
      clientMessageId: 'message-1',
      modelId: 'deepseek',
      responseLanguage: 'en',
    })).resolves.toBe('Backend reply');

    expect(apiRequestMock).toHaveBeenCalledWith('/conversations/conversation-1/messages', {
      method: 'POST',
      authenticated: true,
      signal: undefined,
      timeoutMs: 75_000,
      body: JSON.stringify({
        clientMessageId: 'message-1',
        content: 'hello',
        modelId: 'deepseek',
        responseLanguage: 'en',
      }),
    });
  });

  it('passes cancellation through to the authenticated API client', async () => {
    const controller = new AbortController();
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    apiRequestMock.mockRejectedValue(abortError);

    await expect(requestReply('hello', {
      conversationId: 'conversation-1',
      clientMessageId: 'message-1',
      modelId: 'gpt',
      signal: controller.signal,
    })).rejects.toMatchObject({ name: 'AbortError' });
  });
});
