import { act, renderHook } from '@testing-library/react-native';

import { refreshConversation } from '../../api/conversationApi';
import { requestReply } from '../../api/requestReply';
import { useChatStore } from '../../store/chatStore';
import { useSendPrompt } from '../useSendPrompt';

import { initI18n } from '@/shared/i18n';
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
  let resolveReply: ((value: string) => void) | undefined;
  requestReplyMock.mockImplementation(
    (_prompt, options) =>
      new Promise<string>((resolve) => {
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
    resolveReply?.('Yes, how can I help?');
    await Promise.resolve();
  });

  const conversation = useChatStore
    .getState()
    .conversations.find((item) => item.id === conversationId);
  expect(conversation?.messages.at(-1)).toMatchObject({
    role: 'assistant',
    text: 'Yes, how can I help?',
  });
  expect(useChatStore.getState().thinkingFor).toBeNull();
  expect(refreshUsageMock).toHaveBeenCalledTimes(1);
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
