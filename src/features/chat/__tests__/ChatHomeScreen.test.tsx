import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ChatHomeScreen from '../screens/ChatHomeScreen';
import { DEFAULT_MODEL, findModel } from '../constants';
import { useChatStore, UPSELL_AFTER_PROMPTS } from '../store/chatStore';
import { initI18n } from '@/shared/i18n';
import { usePlanStore } from '@/shared/plan';
import { THEMES, ThemeProvider, useThemeStore, type ThemeMode } from '@/shared/theme';

/*
 * Chat home (Figma 404:1772 empty state, 404:804 with the drawer). Covers the
 * empty state's copy, the composer's send-appears-on-typing contract, the four
 * dismissible surfaces, new-chat → Recents, and the adaptive palette.
 */

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/*
 * `null` = don't force a mode, let the provider resolve it from the store the
 * way the app does. It has to be an explicit null rather than `undefined`: a
 * default parameter fires on `undefined` too, which would silently re-pin the
 * mode to dark.
 */
function renderScreen(mode: ThemeMode | null = 'dark') {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider mode={mode ?? undefined}>
        <ChatHomeScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

/** Flattened style of a rendered element, as a single object. */
function styleOf(el: { props: { style?: unknown } }): Record<string, unknown> {
  const style = el.props.style;
  if (Array.isArray(style)) return Object.assign({}, ...style.flat(Infinity).filter(Boolean));
  return (style ?? {}) as Record<string, unknown>;
}

function type(text: string) {
  fireEvent.changeText(screen.getByTestId('chat-composer-input'), text);
}

beforeAll(async () => {
  await initI18n();
});

beforeEach(() => {
  mockPush.mockClear();
  // Both are persisted stores shared across tests — reset them or the plan and
  // appearance chosen by one case leak into the next.
  usePlanStore.setState({ plan: 'free', hasHydrated: true });
  useThemeStore.setState({ preference: 'system', hasHydrated: true });
  useChatStore.setState({
    conversations: [],
    activeId: null,
    model: DEFAULT_MODEL,
    promptCount: 0,
    upsellSeen: false,
    hasHydrated: true,
  });
});

it('renders the welcome hero, model pill and composer', () => {
  renderScreen();

  expect(screen.getByText('Welcome to OneAI Hub')).toBeTruthy();
  expect(screen.getByText('You can ask any complex problem and it will solve those instantly')).toBeTruthy();
  expect(screen.getByText('Upgrade to Pro')).toBeTruthy();
  expect(screen.getByText(findModel(DEFAULT_MODEL).name)).toBeTruthy();
  expect(screen.getByTestId('chat-composer-input')).toBeTruthy();
});

describe('composer', () => {
  it('hides Send until there is a draft, then shows it filled with the action colour', () => {
    renderScreen();

    // Absent, not merely disabled — nothing for a screen reader to find either.
    expect(screen.queryByTestId('chat-send')).toBeNull();

    type('How do I center a div?');

    expect(screen.getByTestId('chat-send')).toBeTruthy();
    // Fill lives on the wrapper (theme-fill two-layer pattern) so the theme
    // flip repaints reliably — see ChatComposer.tsx for the rationale.
    expect(styleOf(screen.getByTestId('chat-send-fill')).backgroundColor).toBe(THEMES.dark.color.accent);
  });

  it('treats a whitespace-only draft as empty', () => {
    renderScreen();

    type('    ');
    expect(screen.queryByTestId('chat-send')).toBeNull();
  });

  it('clears the draft after sending, which hides Send again', () => {
    renderScreen();

    type('Explain quantum tunnelling');
    fireEvent.press(screen.getByTestId('chat-send'));

    expect(screen.getByTestId('chat-composer-input').props.value).toBe('');
    expect(screen.queryByTestId('chat-send')).toBeNull();
  });
});

describe('conversations', () => {
  it('files the first prompt into Recents, titled from what was asked', () => {
    renderScreen();

    type('Design critique for onboarding');
    fireEvent.press(screen.getByTestId('chat-send'));

    const { conversations, activeId } = useChatStore.getState();
    expect(conversations).toHaveLength(1);
    expect(conversations[0].title).toBe('Design critique for onboarding');
    expect(activeId).toBe(conversations[0].id);
  });

  it('keeps the previous chat in Recents when a new chat starts', () => {
    renderScreen();

    type('First conversation');
    fireEvent.press(screen.getByTestId('chat-send'));

    // The home top bar has no compose button — new chat lives in the drawer.
    fireEvent.press(screen.getByTestId('chat-menu'));
    fireEvent.press(screen.getByTestId('drawer-new-chat'));

    // Parked, not lost: still listed, but no longer the active chat.
    expect(useChatStore.getState().conversations).toHaveLength(1);
    expect(useChatStore.getState().activeId).toBeNull();
    expect(screen.getByText('Welcome to OneAI Hub')).toBeTruthy();
  });

  it('appends follow-up prompts to the open chat instead of starting another', () => {
    renderScreen();

    type('First question');
    fireEvent.press(screen.getByTestId('chat-send'));
    type('Follow-up question');
    fireEvent.press(screen.getByTestId('chat-send'));

    const { conversations } = useChatStore.getState();
    expect(conversations).toHaveLength(1);
    expect(conversations[0].messages).toHaveLength(2);
  });
});

describe('surfaces', () => {
  it('opens the drawer on the menu button and lists recents in it', () => {
    renderScreen();

    type('Weekly meal plan');
    fireEvent.press(screen.getByTestId('chat-send'));
    fireEvent.press(screen.getByTestId('chat-menu'));

    expect(screen.getByTestId('chat-drawer')).toBeTruthy();
    expect(screen.getByText('Weekly meal plan')).toBeTruthy();
  });

  it('closes the drawer when the scrim outside it is tapped', async () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('chat-menu'));
    expect(screen.getByTestId('chat-drawer')).toBeTruthy();

    fireEvent.press(screen.getByTestId('overlay-scrim'));

    await waitFor(() => expect(screen.queryByTestId('chat-drawer')).toBeNull());
  });

  it('opens the model menu anchored to the pill, not a bottom sheet', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('chat-model-pill'));

    expect(screen.getByText('Choose a model')).toBeTruthy();
    expect(screen.getByTestId('model-row-gpt')).toBeTruthy();
    // The card hangs off the bar it was opened from: a top offset, no bottom edge.
    const card = screen.getByTestId('model-menu');
    const style = StyleSheet.flatten(card.props.style);
    expect(style.top).toBeGreaterThan(0);
    expect(style.bottom).toBeUndefined();
  });

  it('caps the model list to the room under the bar so it scrolls instead of overflowing', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('chat-model-pill'));

    const list = screen.getByTestId('model-menu-list');
    const { maxHeight } = StyleSheet.flatten(list.props.style);
    // What is left under the bar: the window minus the top inset, the bar's own
    // 22 + 52, the gap, the bottom inset and the clearance.
    const window = Dimensions.get('window');
    expect(maxHeight).toBe(window.height - (47 + 22 + 52 + 8) - 34 - 24);
  });

  it('selects an allowed model and routes a locked one to the upgrade screen', async () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('chat-model-pill'));
    // Claude requires Pro; the signed-in plan is Free.
    fireEvent.press(screen.getByTestId('model-row-claude'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/upgrade'));
    expect(useChatStore.getState().model).toBe(DEFAULT_MODEL);
  });

  it('opens the attachment menu from the + button', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('chat-attach'));

    expect(screen.getByTestId('attachment-menu')).toBeTruthy();
    expect(screen.getByTestId('attachment-camera')).toBeTruthy();
    expect(screen.getByTestId('attachment-photos')).toBeTruthy();
    expect(screen.getByTestId('attachment-files')).toBeTruthy();
  });
});

describe('upsell', () => {
  it(`appears after ${UPSELL_AFTER_PROMPTS} prompts`, () => {
    renderScreen();

    type('First prompt');
    fireEvent.press(screen.getByTestId('chat-send'));
    expect(screen.queryByText('Enjoying using!')).toBeNull();

    type('Second prompt');
    fireEvent.press(screen.getByTestId('chat-send'));
    expect(screen.getByText('Enjoying using!')).toBeTruthy();
  });

  it('does not come back once dismissed', async () => {
    renderScreen();

    type('First prompt');
    fireEvent.press(screen.getByTestId('chat-send'));
    type('Second prompt');
    fireEvent.press(screen.getByTestId('chat-send'));

    fireEvent.press(screen.getByTestId('upsell-close'));
    await waitFor(() => expect(screen.queryByText('Enjoying using!')).toBeNull());

    type('Third prompt');
    fireEvent.press(screen.getByTestId('chat-send'));
    expect(screen.queryByText('Enjoying using!')).toBeNull();
  });

  it('routes to the upgrade screen from its CTA', async () => {
    renderScreen();

    type('First prompt');
    fireEvent.press(screen.getByTestId('chat-send'));
    type('Second prompt');
    fireEvent.press(screen.getByTestId('chat-send'));
    fireEvent.press(screen.getByTestId('upsell-upgrade'));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/upgrade'));
  });
});

describe('plan gating', () => {
  it('offers Upgrade to Pro on Free, Upgrade to Business on Pro, and hides on Business', () => {
    renderScreen();
    expect(screen.getByText('Upgrade to Pro')).toBeTruthy();
    screen.unmount();

    usePlanStore.setState({ plan: 'pro' });
    renderScreen();
    expect(screen.getByText('Upgrade to Business')).toBeTruthy();
    screen.unmount();

    usePlanStore.setState({ plan: 'business' });
    renderScreen();
    expect(screen.queryByTestId('chat-upgrade')).toBeNull();
  });

  it('tags the drawer with the plan the user is actually on', () => {
    usePlanStore.setState({ plan: 'business' });
    renderScreen();

    fireEvent.press(screen.getByTestId('chat-menu'));
    expect(screen.getByText('Business plan')).toBeTruthy();
  });

  it('does not nudge a paying user with the upsell', () => {
    usePlanStore.setState({ plan: 'pro' });
    renderScreen();

    for (let i = 0; i < UPSELL_AFTER_PROMPTS; i += 1) {
      type(`Prompt ${i}`);
      fireEvent.press(screen.getByTestId('chat-send'));
    }

    expect(screen.queryByText('Enjoying using!')).toBeNull();
  });
});

describe('appearance switch', () => {
  it('stores an explicit preference and repaints from the other palette', () => {
    // Start from a STORED dark preference, not the OS: the point under test is
    // the store → provider path, and the emulated OS scheme differs per runner.
    useThemeStore.setState({ preference: 'dark' });
    renderScreen(null);

    expect(styleOf(screen.getByText('Welcome to OneAI Hub')).color).toBe(THEMES.dark.color.textPrimary);

    fireEvent.press(screen.getByTestId('chat-theme-toggle'));

    // The choice outranks the OS from now on, and it survives a restart.
    expect(useThemeStore.getState().preference).toBe('light');
    expect(styleOf(screen.getByText('Welcome to OneAI Hub')).color).toBe(THEMES.light.color.textPrimary);
  });

  it('repaints the muted fills (Upgrade chip, model pill, menu, theme icon) alongside the text', () => {
    // Reproduces the bug the user reported in the problem folder: the canvas
    // and text flip on toggle, but the inline `backgroundColor: theme.color.muted`
    // fills on the memo'd children (top bar + welcome hero) stick on the
    // previous palette. The fix is the themed-fill two-layer pattern (see
    // IconPillButton): the muted fill lives on a plain <View> wrapper around
    // the AnimatedPressable, so the theme repaint goes through the normal RN
    // style path. The "*-fill" testIDs target those wrappers.
    useThemeStore.setState({ preference: 'dark' });
    renderScreen(null);

    const upgrade = screen.getByTestId('chat-upgrade-fill');
    const modelPill = screen.getByTestId('chat-model-pill-fill');
    const menu = screen.getByTestId('chat-menu');

    expect(styleOf(upgrade).backgroundColor).toBe(THEMES.dark.color.muted);
    expect(styleOf(modelPill).backgroundColor).toBe(THEMES.dark.color.muted);
    // The menu icon button uses IconPillButton with `filled` → muted.
    expect(styleOf(menu).backgroundColor).toBe(THEMES.dark.color.muted);

    fireEvent.press(screen.getByTestId('chat-theme-toggle'));

    expect(useThemeStore.getState().preference).toBe('light');
    expect(styleOf(upgrade).backgroundColor).toBe(THEMES.light.color.muted);
    expect(styleOf(modelPill).backgroundColor).toBe(THEMES.light.color.muted);
    expect(styleOf(menu).backgroundColor).toBe(THEMES.light.color.muted);
  });
});

it('offers the language switch inside the drawer', () => {
  renderScreen();

  fireEvent.press(screen.getByTestId('chat-menu'));

  expect(screen.getByTestId('drawer-language')).toBeTruthy();
  expect(screen.getByText('EN')).toBeTruthy();
  expect(screen.getByText('AR')).toBeTruthy();
});

it('paints from the dark palette in dark mode and the light palette in light mode', () => {
  renderScreen('dark');
  expect(styleOf(screen.getByText('Welcome to OneAI Hub')).color).toBe(THEMES.dark.color.textPrimary);
  screen.unmount();

  renderScreen('light');
  expect(styleOf(screen.getByText('Welcome to OneAI Hub')).color).toBe(THEMES.light.color.textPrimary);
});
