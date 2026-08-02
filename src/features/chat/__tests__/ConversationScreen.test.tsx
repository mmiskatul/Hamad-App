import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ConversationScreen from '../screens/ConversationScreen';
import { deleteConversation as deleteConversationRemote } from '../api/conversationApi';
import { migrateChatState, useChatStore, type Conversation } from '../store/chatStore';

import { useProjectStore, type Project } from '@/features/projects';
import { initI18n } from '@/shared/i18n';
import { usePlanStore } from '@/shared/plan';
import { THEMES, ThemeProvider, useThemeStore, type ThemeMode } from '@/shared/theme';
import { useUsageStore } from '@/shared/usage';

/*
 * Conversation view (Figma 144:1314 thinking, 146:1652 answered).
 *
 * What is worth pinning down here is the STATE MACHINE around a reply — the
 * hydration gate, the thinking indicator appearing and then going away, and the
 * rule that exactly one message reveals word by word — not the pixel layout.
 */

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockRedirect = jest.fn();
jest.mock('../api/conversationApi', () => ({
  deleteConversation: jest.fn(),
  updateConversation: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => true,
  }),
  Redirect: (props: { href: string }) => {
    mockRedirect(props.href);
    return null;
  },
}));

const mockDeleteConversationRemote = jest.mocked(deleteConversationRemote);

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve()) }));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen(mode: ThemeMode | null = 'dark') {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider mode={mode ?? undefined}>
        <ConversationScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

function conversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: 'c1',
    title: 'Suggest a Event planning',
    model: 'gpt',
    updatedAt: 1000,
    pinned: false,
    project: null,
    messages: [{ id: 'm1', role: 'user', text: 'Suggest a Event planning', at: 1000 }],
    attachments: [],
    ...overrides,
  };
}

beforeAll(async () => {
  await initI18n();
});

beforeEach(() => {
  jest.useFakeTimers();
  mockPush.mockClear();
  mockBack.mockClear();
  mockReplace.mockClear();
  mockRedirect.mockClear();
  mockDeleteConversationRemote.mockReset();
  mockDeleteConversationRemote.mockResolvedValue();
  usePlanStore.setState({ plan: 'free', hasHydrated: true });
  useUsageStore.setState({ requests: 0, tokens: 0, byModel: {}, hasHydrated: true });
  useProjectStore.setState({
    projects: [],
    editingId: null,
    filter: 'all',
    hasHydrated: true,
  });
  useChatStore.setState({
    conversations: [conversation()],
    activeId: 'c1',
    thinkingFor: null,
    streamingId: null,
    promptCount: 0,
    upsellSeen: false,
    hasHydrated: true,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ConversationScreen', () => {
  it('waits for hydration instead of redirecting off a first-frame null', () => {
    useChatStore.setState({ activeId: null, conversations: [], hasHydrated: false });
    renderScreen();

    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects home once hydrated with no open conversation', () => {
    useChatStore.setState({ activeId: null, hasHydrated: true });
    renderScreen();

    expect(mockRedirect).toHaveBeenCalledWith('/home');
  });

  it('renders the transcript, with no breadcrumb on a plain chat', () => {
    renderScreen();

    expect(screen.getByTestId('message-m1')).toBeTruthy();
    // A chat started from home is not inside anything, so there is nothing to
    // put in a breadcrumb — the design shows none either.
    expect(screen.queryByTestId('conversation-breadcrumb')).toBeNull();
  });

  it('shows the project breadcrumb on a project-scoped chat', () => {
    useChatStore.setState({
      conversations: [conversation({ project: { id: 'p1', name: 'Event planning' } })],
    });
    renderScreen();

    expect(screen.getByTestId('conversation-breadcrumb')).toBeTruthy();
  });

  it('tags the next new chat with the project it was opened from', () => {
    useChatStore.getState().startProjectChat({ id: 'p1', name: 'Event planning' });

    expect(useChatStore.getState().activeId).toBeNull();

    useChatStore.getState().sendPrompt('Plan the venue');

    const created = useChatStore.getState().conversations[0];
    expect(created.project).toEqual({ id: 'p1', name: 'Event planning' });
    // Consumed once — a later unrelated chat must not inherit it.
    expect(useChatStore.getState().pendingProject).toBeNull();
  });

  it('shows the thinking indicator only while a reply is in flight', () => {
    renderScreen();
    expect(screen.queryByTestId('chat-thinking')).toBeNull();

    act(() => {
      useChatStore.setState({ thinkingFor: 'c1' });
    });
    expect(screen.getByTestId('chat-thinking')).toBeTruthy();

    act(() => {
      useChatStore.getState().receiveReply('c1', 'Here is a plan.');
    });
    expect(screen.queryByTestId('chat-thinking')).toBeNull();
  });

  it('sends a prompt, thinks, then files the reply and marks it for reveal', async () => {
    renderScreen();

    fireEvent.changeText(screen.getByTestId('chat-composer-input'), 'Plan my launch party');
    fireEvent.press(screen.getByTestId('chat-send'));

    expect(useChatStore.getState().thinkingFor).toBe('c1');

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    const state = useChatStore.getState();
    const messages = state.conversations[0].messages;
    const last = messages[messages.length - 1];

    expect(last.role).toBe('assistant');
    expect(state.thinkingFor).toBeNull();
    // Exactly the new message reveals — that is what stops the whole history
    // replaying its animation.
    expect(state.streamingId).toBe(last.id);
  });

  it('reveals only the streaming message, not the rest of the transcript', () => {
    useChatStore.setState({
      conversations: [
        conversation({
          messages: [
            { id: 'm1', role: 'user', text: 'Hi', at: 1000 },
            { id: 'm2', role: 'assistant', text: 'One two three four', at: 1001 },
            { id: 'm3', role: 'assistant', text: 'Five six seven eight', at: 1002 },
          ],
        }),
      ],
      streamingId: 'm3',
    });
    renderScreen();

    // Rendering settled history must not clear the arriving message's reveal.
    expect(useChatStore.getState().streamingId).toBe('m3');

    // The settled reply is fully on screen from the first frame...
    expect(screen.getByTestId('message-m2-text')).toBeTruthy();
    expect(String(screen.getByTestId('message-m2-text').props.accessibilityLabel)).toBe(
      'One two three four',
    );

    // ...while the streaming one starts empty and fills in.
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(screen.getByTestId('message-m3-text')).toBeTruthy();
  });

  it('opens the model sheet from the header pill', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('conversation-model-pill'));

    expect(screen.getByTestId('model-row-gpt')).toBeTruthy();
  });

  it('confirms backend deletion before leaving for home', async () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('conversation-menu'));
    fireEvent.press(screen.getByTestId('chat-menu-delete'));

    expect(screen.getByTestId('delete-chat-dialog')).toBeTruthy();
    expect(useChatStore.getState().conversations).toHaveLength(1);

    fireEvent.press(screen.getByTestId('delete-chat-confirm'));

    await waitFor(() => expect(mockDeleteConversationRemote).toHaveBeenCalledWith('c1'));
    await waitFor(() => expect(useChatStore.getState().conversations).toHaveLength(0));
    expect(mockReplace).toHaveBeenCalledWith('/home');
  });

  it('renders usage chip and warning when quota limit is exceeded', () => {
    useUsageStore.setState({ requests: 100, tokens: 0, byModel: {}, hasHydrated: true });
    renderScreen();

    expect(screen.getByTestId('usage-chip')).toBeTruthy();
    expect(screen.getByTestId('usage-chip-warning')).toBeTruthy();
  });

  it('repaints the usage-chip muted fill when the theme flips', () => {
    // The muted fill lives on the outer <View testID="usage-chip-fill">, not
    // on the AnimatedPressable — keeping the theme token on the normal RN
    // style path is what repaints on a flip. If the architecture regresses
    // and the fill moves back onto the pressable, this test still passes
    // but the on-device repaint breaks (caught by the integration runs).
    useThemeStore.setState({ preference: 'dark' });
    renderScreen(null);

    const fill = StyleSheet.flatten(screen.getByTestId('usage-chip-fill').props.style);
    expect(fill.backgroundColor).toBe(THEMES.dark.color.muted);

    act(() => {
      useThemeStore.setState({ preference: 'light' });
    });

    const repainted = StyleSheet.flatten(screen.getByTestId('usage-chip-fill').props.style);
    expect(repainted.backgroundColor).toBe(THEMES.light.color.muted);
  });

  it('the quota chip is a tap button that opens the plan card, not a dropdown', () => {
    renderScreen();

    // No chevron to hit: the chip itself is the whole target.
    expect(screen.queryByTestId('usage-chip-dropdown')).toBeNull();

    fireEvent.press(screen.getByTestId('usage-chip'));

    expect(screen.getByTestId('plan-menu')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('a tap anywhere outside the plan card closes it', async () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('usage-chip'));
    // The scrim is the whole screen, so "outside the card" is anywhere at all.
    fireEvent.press(screen.getByTestId('overlay-scrim'));

    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(screen.queryByTestId('plan-menu')).toBeNull();
  });

  it('the plan menu is the attachment menu twin: same width, same corner, hung above', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('usage-chip'));
    const plan = StyleSheet.flatten(screen.getByTestId('plan-menu').props.style);

    fireEvent.press(screen.getByTestId('overlay-scrim'));
    act(() => {
      jest.advanceTimersByTime(400);
    });
    fireEvent.press(screen.getByTestId('chat-attach'));
    const attach = StyleSheet.flatten(screen.getByTestId('attachment-menu').props.style);

    expect(plan.width).toBe(attach.width);
    expect(plan.borderRadius).toBe(attach.borderRadius);
    // Same placement rule too: leading edge, hung off the bottom inset, never a
    // top offset. Only the distance differs, since the controls do.
    expect(plan.start).toBe(attach.start);
    expect(plan.bottom).toBeGreaterThan(attach.bottom);
    expect(plan.top).toBeUndefined();
  });

  it('the plan menu routes to the plans and to the top-up tab', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('usage-chip'));
    fireEvent.press(screen.getByTestId('plan-menu-pro'));
    expect(mockPush).toHaveBeenCalledWith('/upgrade');

    fireEvent.press(screen.getByTestId('usage-chip'));
    fireEvent.press(screen.getByTestId('plan-menu-extra'));
    expect(mockPush).toHaveBeenCalledWith('/upgrade?period=extra');
  });

  it('the whole spent-quota line is one tap target for the top-up', () => {
    useUsageStore.setState({ requests: 100, tokens: 0, byModel: {}, hasHydrated: true });
    renderScreen();

    fireEvent.press(screen.getByTestId('usage-chip-warning'));

    expect(mockPush).toHaveBeenCalledWith('/upgrade?period=extra');
  });

  it('opens chat drawer from top left menu button', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('conversation-menu-drawer'));

    expect(screen.getByTestId('chat-drawer')).toBeTruthy();
  });
});

function projectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p1',
    name: 'Event planning',
    description: '',
    instructions: '',
    scope: 'default',
    pinned: false,
    shared: false,
    sources: [],
    updatedAt: 1000,
    ...overrides,
  };
}

/*
 * Figma 404:1915 (unpinned) and 404:1940 (pinned) — the project-chat three-dot
 * dropdown. It replaces the per-chat menu only when the chat is inside a
 * project, and its actions target the project, not the chat.
 */
describe('ConversationScreen — project chat dropdown', () => {
  it('opens the project menu (not the chat menu) on a project chat', () => {
    useProjectStore.setState({ projects: [projectFixture()] });
    useChatStore.setState({
      conversations: [conversation({ project: { id: 'p1', name: 'Event planning' } })],
    });
    renderScreen();

    fireEvent.press(screen.getByTestId('conversation-menu'));

    expect(screen.getByTestId('project-menu')).toBeTruthy();
    // The per-chat menu's three-dot items must NOT be there — only the project
    // menu owns the trailing slot on a project chat.
    expect(screen.queryByTestId('chat-menu')).toBeNull();
    expect(screen.queryByTestId('chat-menu-rename')).toBeNull();
  });

  it('routes the rename / sources / instructions actions to their project screens', () => {
    useProjectStore.setState({ projects: [projectFixture()] });
    useChatStore.setState({
      conversations: [conversation({ project: { id: 'p1', name: 'Event planning' } })],
    });
    renderScreen();

    fireEvent.press(screen.getByTestId('conversation-menu'));
    fireEvent.press(screen.getByTestId('project-menu-rename'));

    // The project becomes the editing target — same pattern as the projects list.
    expect(useProjectStore.getState().editingId).toBe('p1');
    expect(mockPush).toHaveBeenCalledWith('/project-rename');

    fireEvent.press(screen.getByTestId('conversation-menu'));
    fireEvent.press(screen.getByTestId('project-menu-sources'));
    expect(useProjectStore.getState().editingId).toBe('p1');
    expect(mockPush).toHaveBeenCalledWith('/project-sources');

    fireEvent.press(screen.getByTestId('conversation-menu'));
    fireEvent.press(screen.getByTestId('project-menu-instructions'));
    expect(useProjectStore.getState().editingId).toBe('p1');
    expect(mockPush).toHaveBeenCalledWith('/project-instructions');
  });

  it('toggles the project pin from the menu (Figma 404:1940 reflects the unpinned state)', () => {
    useProjectStore.setState({ projects: [projectFixture()] });
    useChatStore.setState({
      conversations: [conversation({ project: { id: 'p1', name: 'Event planning' } })],
    });
    renderScreen();

    fireEvent.press(screen.getByTestId('conversation-menu'));
    fireEvent.press(screen.getByTestId('project-menu-pin'));

    expect(useProjectStore.getState().projects[0].pinned).toBe(true);
    // The chat's own pin must NOT change — pin is project-scoped.
    expect(useChatStore.getState().conversations[0].pinned).toBe(false);
  });

  it('deleting the project removes the chat and returns home so the breadcrumb does not dangle', () => {
    useProjectStore.setState({ projects: [projectFixture()] });
    useChatStore.setState({
      conversations: [conversation({ project: { id: 'p1', name: 'Event planning' } })],
    });
    renderScreen();

    fireEvent.press(screen.getByTestId('conversation-menu'));
    fireEvent.press(screen.getByTestId('project-menu-delete'));

    expect(useProjectStore.getState().projects).toHaveLength(0);
    expect(useChatStore.getState().conversations).toHaveLength(0);
    expect(mockReplace).toHaveBeenCalledWith('/home');
  });

  it('keeps the per-chat menu on a non-project chat', () => {
    // No project on the conversation, no project in the store → the existing
    // chat menu stays in charge of the trailing slot.
    renderScreen();

    fireEvent.press(screen.getByTestId('conversation-menu'));

    expect(screen.getByTestId('chat-menu')).toBeTruthy();
    expect(screen.queryByTestId('project-menu')).toBeNull();
  });
});

/*
 * The fresh-project entry: the user opened a project from the projects list
 * and has not yet sent the first prompt. There is no chat id, but there IS a
 * pendingProject, so the three-dot still routes to the project menu.
 */
describe('ConversationScreen — fresh project chat dropdown', () => {
  it('opens the project menu on the trailing three-dot', () => {
    useProjectStore.setState({ projects: [projectFixture()] });
    // Trigger the store action the route file uses when "open" is tapped on a row.
    useChatStore.getState().startProjectChat({ id: 'p1', name: 'Event planning' });
    renderScreen();

    fireEvent.press(screen.getByTestId('conversation-menu'));

    expect(screen.getByTestId('project-menu')).toBeTruthy();
    expect(screen.queryByTestId('chat-menu')).toBeNull();
  });

  it('routes the fresh-project menu to /project-rename and tags the project', () => {
    useProjectStore.setState({ projects: [projectFixture()] });
    useChatStore.getState().startProjectChat({ id: 'p1', name: 'Event planning' });
    renderScreen();

    fireEvent.press(screen.getByTestId('conversation-menu'));
    fireEvent.press(screen.getByTestId('project-menu-rename'));

    expect(useProjectStore.getState().editingId).toBe('p1');
    expect(mockPush).toHaveBeenCalledWith('/project-rename');
  });

  it('toggles the project pin on a fresh-project entry too', () => {
    useProjectStore.setState({ projects: [projectFixture()] });
    useChatStore.getState().startProjectChat({ id: 'p1', name: 'Event planning' });
    renderScreen();

    fireEvent.press(screen.getByTestId('conversation-menu'));
    fireEvent.press(screen.getByTestId('project-menu-pin'));

    expect(useProjectStore.getState().projects[0].pinned).toBe(true);
  });
});

describe('migrateChatState v2', () => {
  it('gives every stored message a stable id', () => {
    const migrated = migrateChatState(
      { conversations: [{ id: 'c1', messages: [{ role: 'user', text: 'hi', at: 1 }] }] },
      1,
    ) as { conversations: Conversation[] };

    expect(migrated.conversations[0].messages[0].id).toBe('m_c1_0');
  });

  it('still backfills the v1 fields when coming from v0', () => {
    const migrated = migrateChatState(
      { conversations: [{ id: 'c1', messages: [{ role: 'user', text: 'hi', at: 1 }] }] },
      0,
    ) as { conversations: Conversation[] };

    expect(migrated.conversations[0].pinned).toBe(false);
    expect(migrated.conversations[0].attachments).toEqual([]);
    expect(migrated.conversations[0].messages[0].id).toBe('m_c1_0');
  });
});
