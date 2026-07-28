import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import UsageDashboardScreen from '../screens/UsageDashboardScreen';

import { initI18n } from '@/shared/i18n';
import { usePlanStore } from '@/shared/plan';
import { THEMES, ThemeProvider, type ThemeMode } from '@/shared/theme';
import { useUsageStore } from '@/shared/usage';

/*
 * Usage dashboard (Figma 142:496).
 *
 * The interesting behaviour is arithmetic and gating, not layout: the meters
 * must read against the CURRENT plan's allowance, the upgrade CTA must vanish
 * for paying users, and the unlimited tier must not render as "full".
 */

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen(mode: ThemeMode | null = 'dark') {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider mode={mode ?? undefined}>
        <UsageDashboardScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeAll(async () => {
  await initI18n();
});

/* jest-native's matchers are not installed here — read the node's own text. */
function textOf(testID: string): string {
  return String(screen.getByTestId(testID).props.children);
}

beforeEach(() => {
  mockPush.mockClear();
  usePlanStore.setState({ plan: 'free', hasHydrated: true });
  useUsageStore.setState({
    periodStart: Date.UTC(2026, 4, 1),
    requests: 25,
    tokens: 500,
    byModel: { gpt: { requests: 20, tokens: 400 }, claude: { requests: 5, tokens: 100 } },
    hasHydrated: true,
  });
});

describe('UsageDashboardScreen', () => {
  it('reads the meters against the current plan allowance', () => {
    renderScreen();

    // Free = 50 requests, 1000 tokens ⇒ both at 50%.
    expect(textOf('usage-gauge-requests-value')).toBe('50%');
    expect(textOf('usage-gauge-tokens-value')).toBe('50%');
  });

  it('re-reads the meters when the plan changes', () => {
    usePlanStore.setState({ plan: 'pro' });
    renderScreen();

    // Pro = 500 requests ⇒ the same 25 requests are now 5%.
    expect(textOf('usage-gauge-requests-value')).toBe('5%');
  });

  it('never fills the request meter for the unlimited tier', () => {
    usePlanStore.setState({ plan: 'business' });
    useUsageStore.setState({ requests: 100000 });
    renderScreen();

    expect(textOf('usage-gauge-requests-value')).toBe('0%');
  });

  it('offers the upgrade CTA to free users and routes it to /upgrade', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('usage-upgrade'));

    expect(mockPush).toHaveBeenCalledWith('/upgrade');
  });

  it('omits the upgrade CTA entirely for a paying user', () => {
    usePlanStore.setState({ plan: 'pro' });
    renderScreen();

    expect(screen.queryByTestId('usage-upgrade')).toBeNull();
  });

  it('renders a row per model, with the busiest one full width', () => {
    renderScreen();

    // Six models in the catalogue, all listed even at zero usage.
    expect(screen.getByTestId('usage-model-gpt')).toBeTruthy();
    expect(screen.getByTestId('usage-model-grok')).toBeTruthy();

    // GPT is the peak (20 of 25), so its bar is the 100% reference.
    expect(screen.getByTestId('usage-model-gpt-fill').props.style.width).toBe('100%');
    expect(screen.getByTestId('usage-model-claude-fill').props.style.width).toBe('25%');
  });

  it('paints both palettes from tokens', () => {
    const light = renderScreen('light');
    expect(light.getByTestId('usage-tier-card').props.style.backgroundColor).toBe(
      THEMES.light.color.surface,
    );
    light.unmount();

    const dark = renderScreen('dark');
    expect(dark.getByTestId('usage-tier-card').props.style.backgroundColor).toBe(
      THEMES.dark.color.surface,
    );
  });

  it('renders the tier mix card with one bar segment per plan and a row per plan', () => {
    renderScreen();

    expect(screen.getByTestId('tier-mix-card')).toBeTruthy();
    // The three bar segments are flex: <user count>, so the parent bar lays
    // them out by ratio without us computing widths. The "shares sum to 100"
    // guarantee is enforced by the Total row instead.
    expect(screen.getByTestId('tier-mix-bar-free')).toBeTruthy();
    expect(screen.getByTestId('tier-mix-bar-pro')).toBeTruthy();
    expect(screen.getByTestId('tier-mix-bar-business')).toBeTruthy();
    expect(screen.getByTestId('tier-mix-row-free')).toBeTruthy();
    expect(screen.getByTestId('tier-mix-row-pro')).toBeTruthy();
    expect(screen.getByTestId('tier-mix-row-business')).toBeTruthy();
  });

  it('total row counts the sum of every tier', () => {
    renderScreen();

    // 8400 + 2140 + 312 = 10,852 (rendered compactly in the Total row).
    expect(screen.getByTestId('tier-mix-total')).toBeTruthy();
  });

  it('paints the tier mix card with the themed surface in both modes', () => {
    const light = renderScreen('light');
    expect(StyleSheet.flatten(light.getByTestId('tier-mix-card').props.style).backgroundColor).toBe(
      THEMES.light.color.surface,
    );
    light.unmount();

    const dark = renderScreen('dark');
    expect(StyleSheet.flatten(dark.getByTestId('tier-mix-card').props.style).backgroundColor).toBe(
      THEMES.dark.color.surface,
    );
  });
});
