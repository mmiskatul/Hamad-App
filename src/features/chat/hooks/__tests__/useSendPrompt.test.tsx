import { act, renderHook } from '@testing-library/react-native';

import { refreshConversation } from '../../api/conversationApi';
import { requestReply } from '../../api/requestReply';
import { useChatStore } from '../../store/chatStore';
import { useSendPrompt } from '../useSendPrompt';

import { initI18n } from '@/shared/i18n';
import { ApiError } from '@/shared/api/client';
import { refreshUsageSnapshot } from '@/shared/usage';

jest.mock('../../api/conversationApi', () => ({ refreshConversation: jest.fn() }));
jest.mock('../../api/requestReply', () => ({ requestReply: jest.fn() }));
jest.mock('@/shared/usage', () => ({ refreshUsageSnapshot: jest.fn() }));

const requestReplyMock = requestReply as jest.MockedFunction<typeof requestReply>;
const refreshConversationMock = refreshConversation as jest.MockedFunction<
  typeof refreshConversation
>;
const refreshUsageMock = refreshUsageSnapshot as jest.MockedFunction<
  typeof refreshUsageSnapshot
>;

beforeAll(async () => {
  await initI18n();
});

beforeEach(() => {
  jest.clearAllMocks();
  refreshConversationMock.mockResolvedValue(null);
  refreshUsageMock.mockResolvedValue(null);
  useChatStore.setState({
    conversations: [],
    activeId: null,
    model: 'gpt',
    thinkingFor: null,
    streamingId: null,
    promptCount: 0,
    upsellSeen: false,
    pendingProject: null,
    hasHydrated: true,
  });
});

it('keeps the first reply alive when fresh chat unmounts after creating the conversation', async () => {
  let resolveReply: ((value: { id: string; text: string; generatedImages: never[] }) => void) | undefined;
  requestReplyMock.mockImplementation(
    (_prompt, options) =>
      new Promise<{ id: string; text: string; generatedImages: never[] }>((resolve) => {
        resolveReply = resolve;
        expect(options.signal?.aborted).toBe(false);
      }),
  );

  const { result, unmount } = renderHook(() => useSendPrompt(null));

  act(() => result.current('Hi, can you help me?'));
  const conversationId = useChatStore.getState().activeId;
  expect(conversationId).not.toBeNull();
  expect(useChatStore.getState().thinkingFor).toBe(conversationId);

  unmount();
  const signal = requestReplyMock.mock.calls[0]?.[1].signal;
  expect(signal?.aborted).toBe(false);

  await act(async () => {
    resolveReply?.({ id: 'srv-reply-1', text: 'Yes, how can I help?', generatedImages: [] });
    await Promise.resolve();
  });

  const conversation = useChatStore
    .getState()
    .conversations.find((item) => item.id === conversationId);
  expect(conversation?.messages.at(-1)).toMatchObject({
    id: 'srv-reply-1',
    role: 'assistant',
    text: 'Yes, how can I help?',
  });
  expect(useChatStore.getState().thinkingFor).toBeNull();
  expect(useChatStore.getState().streamingId).toBe('srv-reply-1');
  expect(refreshUsageMock).toHaveBeenCalledTimes(1);
});

it('files generated images on the assistant message so they render immediately', async () => {
  requestReplyMock.mockResolvedValue({
    id: 'srv-img-1',
    text: 'Here you go',
    generatedImages: [
      {
        id: 'att-1',
        name: 'cat.png',
        mimeType: 'image/png',
        size: 1024,
        at: 1000,
        uri: 'http://api/conversations/c1/attachments/att-1/content',
      },
    ],
  });

  const { result } = renderHook(() => useSendPrompt(null));

  await act(async () => {
    result.current('Draw a cat');
    await Promise.resolve();
  });

  const conversation = useChatStore.getState().conversations[0];
  expect(conversation?.messages.at(-1)).toMatchObject({
    id: 'srv-img-1',
    role: 'assistant',
    text: 'Here you go',
    generatedImages: [
      expect.objectContaining({
        id: 'att-1',
        name: 'cat.png',
        mimeType: 'image/png',
      }),
    ],
  });
  expect(useChatStore.getState().streamingId).toBe('srv-img-1');
});

it('retries refreshConversation once on a transient 502 and still lands the reply', async () => {
  requestReplyMock.mockResolvedValue({
    id: 'srv-img-2',
    text: 'Here you go',
    generatedImages: [],
  });
  refreshConversationMock
    .mockRejectedValueOnce(new ApiError(502, 'PROVIDER_REQUEST_FAILED', 'Temporary failure'))
    .mockResolvedValueOnce(null);

  const { result } = renderHook(() => useSendPrompt(null));

  await act(async () => {
    result.current('Draw a dog');
    await Promise.resolve();
    await Promise.resolve();
  });

  const conversation = useChatStore.getState().conversations[0];
  expect(conversation?.messages.at(-1)).toMatchObject({
    id: 'srv-img-2',
    role: 'assistant',
    text: 'Here you go',
  });
  expect(refreshConversationMock).toHaveBeenCalledTimes(2);
});

it('sends the model currently selected for an open conversation', () => {
  requestReplyMock.mockReturnValue(new Promise(() => undefined));
  useChatStore.getState().sendPrompt('Create the conversation');
  const conversationId = useChatStore.getState().activeId;
  expect(conversationId).not.toBeNull();

  useChatStore.getState().setModel('deepseek');
  const { result } = renderHook(() => useSendPrompt(conversationId));

  act(() => result.current('Use the selected model'));

  expect(requestReplyMock).toHaveBeenLastCalledWith(
    'Use the selected model',
    expect.objectContaining({
      conversationId,
      modelId: 'deepseek',
    }),
  );
});

it('shows the backend error and clears thinking when generation fails', async () => {
  requestReplyMock.mockRejectedValue(new Error('OpenAI is temporarily unavailable.'));
  const { result } = renderHook(() => useSendPrompt(null));

  await act(async () => {
    result.current('Hello');
    await Promise.resolve();
  });

  const conversation = useChatStore.getState().conversations[0];
  expect(conversation?.messages.at(-1)).toMatchObject({
    role: 'assistant',
    text: 'OpenAI is temporarily unavailable.',
  });
  expect(useChatStore.getState().thinkingFor).toBeNull();
});

it('refreshes authoritative usage when the backend rejects an over-quota message', async () => {
  requestReplyMock.mockRejectedValue(
    new ApiError(429, 'TOKEN_LIMIT_REACHED', 'You have used all tokens in your free plan.'),
  );
  const { result } = renderHook(() => useSendPrompt(null));

  await act(async () => {
    result.current('Hello');
    await Promise.resolve();
  });

  expect(refreshUsageMock).toHaveBeenCalledTimes(1);
  expect(useChatStore.getState().conversations[0]?.messages.at(-1)).toMatchObject({
    role: 'assistant',
    text: 'You have used all tokens in your free plan.',
  });
});
