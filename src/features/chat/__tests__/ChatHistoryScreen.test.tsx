import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ChatFilesScreen from '../screens/ChatFilesScreen';
import ChatHistoryScreen from '../screens/ChatHistoryScreen';
import { DEFAULT_MODEL } from '../constants';
import {
  migrateChatState,
  orderedConversations,
  useChatStore,
  type Conversation,
} from '../store/chatStore';

import { initI18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme';

/*
 * Recent Chat History (Figma 182:723) and Files in chat (184:2882), plus the
 * store operations the row menu promises: rename, pin, delete.
 */

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen(ui: React.ReactElement) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider mode="dark">{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c1',
    title: 'Design critique',
    model: DEFAULT_MODEL,
    updatedAt: Date.UTC(2026, 11, 7, 21, 48),
    pinned: false,
    project: null,
    messages: [],
    attachments: [],
    ...overrides,
  };
}

beforeAll(async () => {
  await initI18n();
});

beforeEach(() => {
  mockPush.mockClear();
  useChatStore.setState({
    conversations: [],
    activeId: null,
    model: DEFAULT_MODEL,
    promptCount: 0,
    upsellSeen: false,
    hasHydrated: true,
  });
});

describe('chat history', () => {
  it('says the list is empty instead of rendering a bare page', () => {
    renderScreen(<ChatHistoryScreen />);
    expect(screen.getByTestId('history-empty')).toBeTruthy();
  });

  it('lists conversations and opens one on tap', () => {
    useChatStore.setState({ conversations: [conversation()] });
    renderScreen(<ChatHistoryScreen />);

    fireEvent.press(screen.getByTestId('history-row-c1'));

    expect(useChatStore.getState().activeId).toBe('c1');
    // Straight to the transcript, not /home — landing on the welcome hero made
    // tapping a chat look like it opened nothing.
    expect(mockPush).toHaveBeenCalledWith('/conversation');
  });

  it('deletes from the row action', () => {
    useChatStore.setState({ conversations: [conversation()] });
    renderScreen(<ChatHistoryScreen />);

    fireEvent.press(screen.getByTestId('history-row-c1-delete'));

    expect(useChatStore.getState().conversations).toHaveLength(0);
  });

  it('opens the per-chat menu on long press and renames through the dialog', async () => {
    useChatStore.setState({ conversations: [conversation()] });
    renderScreen(<ChatHistoryScreen />);

    // No ⋯ affordance exists in the design, so long press is the trigger.
    fireEvent(screen.getByTestId('history-row-c1'), 'longPress');
    expect(screen.getByTestId('chat-menu')).toBeTruthy();

    fireEvent.press(screen.getByTestId('chat-menu-rename'));
    await waitFor(() => expect(screen.getByTestId('rename-chat-input')).toBeTruthy());

    fireEvent.changeText(screen.getByTestId('rename-chat-input'), 'Renamed chat');
    fireEvent.press(screen.getByTestId('rename-chat-save'));

    expect(useChatStore.getState().conversations[0].title).toBe('Renamed chat');
  });

  it('pins from the menu, and pinned chats sort first', () => {
    useChatStore.setState({
      conversations: [
        conversation({ id: 'newer', title: 'Newer', updatedAt: 2000 }),
        conversation({ id: 'older', title: 'Older', updatedAt: 1000 }),
      ],
    });
    renderScreen(<ChatHistoryScreen />);

    fireEvent(screen.getByTestId('history-row-older'), 'longPress');
    fireEvent.press(screen.getByTestId('chat-menu-pin'));

    const { conversations } = useChatStore.getState();
    expect(conversations.find((item) => item.id === 'older')?.pinned).toBe(true);
    // Order is derived, not stored — the pinned one leads despite being older.
    expect(orderedConversations(conversations).map((item) => item.id)).toEqual(['older', 'newer']);
  });

  it('sorts multiple pinned chats by recent pin timestamp', () => {
    const c1 = conversation({ id: 'c1', title: 'First', updatedAt: 1000, pinned: true, pinnedAt: 100 });
    const c2 = conversation({ id: 'c2', title: 'Second', updatedAt: 2000, pinned: true, pinnedAt: 200 });

    expect(orderedConversations([c1, c2]).map((item) => item.id)).toEqual(['c2', 'c1']);
  });

  it('shows the static title in the header', () => {
    useChatStore.setState({
      conversations: [
        conversation({ id: 'a' }),
        conversation({ id: 'b' }),
        conversation({ id: 'c' }),
      ],
    });
    renderScreen(<ChatHistoryScreen />);

    expect(screen.getByTestId('history-header')).toBeTruthy();
    expect(screen.getByText('Recent Chat History')).toBeTruthy();
  });
});

describe('files in chat', () => {
  it('shows the empty state while nothing writes attachments yet', () => {
    useChatStore.setState({ conversations: [conversation()], activeId: 'c1' });
    renderScreen(<ChatFilesScreen />);

    expect(screen.getByTestId('files-empty')).toBeTruthy();
  });

  it('lists the open conversation’s attachments and removes one', () => {
    useChatStore.setState({
      conversations: [
        conversation({
          attachments: [
            { id: 'a1', name: 'IMG_0001.jpg', at: Date.UTC(2026, 11, 7, 21, 48), uri: null },
          ],
        }),
      ],
      activeId: 'c1',
    });
    renderScreen(<ChatFilesScreen />);

    expect(screen.getByText('IMG_0001.jpg')).toBeTruthy();

    fireEvent.press(screen.getByTestId('file-row-a1-remove'));

    expect(useChatStore.getState().conversations[0].attachments).toHaveLength(0);
  });
});

describe('store operations', () => {
  it('backfills pinned + attachments on records stored before v1', () => {
    // Shape as it existed on disk before this batch: no pinned, no attachments.
    const legacy = {
      conversations: [{ id: 'old', title: 'Old chat', model: DEFAULT_MODEL, updatedAt: 1 }],
      activeId: 'old',
      model: DEFAULT_MODEL,
    };

    const migrated = migrateChatState(legacy, 0) as { conversations: Conversation[] };

    expect(migrated.conversations[0].pinned).toBe(false);
    // Without this, the first removeAttachment() would throw on undefined.
    expect(migrated.conversations[0].attachments).toEqual([]);
  });

  it('refuses a blank rename rather than storing an untappable row', () => {
    useChatStore.setState({ conversations: [conversation()] });

    useChatStore.getState().renameConversation('c1', '   ');

    expect(useChatStore.getState().conversations[0].title).toBe('Design critique');
  });

  it('clears activeId when the OPEN conversation is deleted', () => {
    useChatStore.setState({ conversations: [conversation()], activeId: 'c1' });

    useChatStore.getState().deleteConversation('c1');

    // Otherwise the next prompt appends to a conversation that no longer exists.
    expect(useChatStore.getState().activeId).toBeNull();
  });

  it('keeps activeId when a DIFFERENT conversation is deleted', () => {
    useChatStore.setState({
      conversations: [conversation(), conversation({ id: 'c2' })],
      activeId: 'c1',
    });

    useChatStore.getState().deleteConversation('c2');

    expect(useChatStore.getState().activeId).toBe('c1');
  });
});
