import { ApiError, apiRequest } from '@/shared/api/client';
import { requestReply } from '../requestReply';

jest.mock('@/shared/api/client', () => ({
  ...jest.requireActual('@/shared/api/client'),
  apiRequest: jest.fn(),
}));

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
    })).resolves.toEqual({
      id: 'reply-1',
      text: 'Backend reply',
      generatedImages: [],
    });

    expect(apiRequestMock).toHaveBeenCalledWith('/conversations/conversation-1/messages', {
      method: 'POST',
      authenticated: true,
      signal: undefined,
      timeoutMs: 195_000,
      body: JSON.stringify({
        clientMessageId: 'message-1',
        content: 'hello',
        modelId: 'deepseek',
        responseLanguage: 'en',
      }),
    });
  });

  it('maps generated images from the response into ChatAttachment records', async () => {
    apiRequestMock.mockResolvedValue({
      assistantMessage: {
        id: 'reply-1',
        content: 'Here you go',
        modelId: 'gemini',
        provider: 'Gemini',
        language: 'en',
        createdAt: '2026-08-01T00:00:00.000Z',
        generatedImages: [
          {
            id: 'att-1',
            name: 'cat.png',
            mimeType: 'image/png',
            size: 1024,
            createdAt: '2026-08-01T00:00:00.000Z',
          },
        ],
      },
    });

    await expect(requestReply('draw a cat', {
      conversationId: 'conversation-1',
      clientMessageId: 'message-1',
      modelId: 'gemini',
    })).resolves.toEqual({
      id: 'reply-1',
      text: 'Here you go',
      generatedImages: [
        expect.objectContaining({
          id: 'att-1',
          name: 'cat.png',
          mimeType: 'image/png',
          size: 1024,
          uri: expect.stringContaining('/conversations/conversation-1/attachments/att-1/content'),
        }),
      ],
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

  it('retries one transient provider failure with the same idempotency key', async () => {
    apiRequestMock
      .mockRejectedValueOnce(new ApiError(502, 'PROVIDER_REQUEST_FAILED', 'Temporary failure'))
      .mockResolvedValueOnce({
        assistantMessage: {
          id: 'reply-2',
          content: 'Recovered reply',
          modelId: 'gpt',
          provider: 'OpenAI',
          language: 'en',
          createdAt: '2026-08-02T00:00:00.000Z',
        },
      });

    await expect(requestReply('hello', {
      conversationId: 'conversation-1',
      clientMessageId: 'message-1',
      modelId: 'gpt',
    })).resolves.toEqual({
      id: 'reply-2',
      text: 'Recovered reply',
      generatedImages: [],
    });

    expect(apiRequestMock).toHaveBeenCalledTimes(2);
    expect(apiRequestMock.mock.calls[0]).toEqual(apiRequestMock.mock.calls[1]);
  });
});
