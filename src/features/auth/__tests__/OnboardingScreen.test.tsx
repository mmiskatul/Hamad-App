import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import OnboardingScreen from '../screens/OnboardingScreen';
import { initI18n } from '@/shared/i18n';
import { ThemeProvider, THEMES } from '@/shared/theme';

/*
 * Regression cover for the "blank screen" class of bug: the app shipped with no
 * babel.config.js, so NativeWind's className prop was inert and every label
 * rendered in the platform default color (black on the #1F1F20 canvas) with no
 * button fills. Nothing failed — it just looked empty.
 *
 * These tests assert the two things that were silently wrong: the copy is
 * actually mounted, and the text carries a deliberate color.
 *
 * The auth subtree is LOCKED TO DARK (see src/features/auth/index.ts) so the
 * palette is the dark one regardless of the resolved theme. This file still
 * parameterises the render over LIGHT and DARK to confirm the screen does
 * NOT flip with the theme — auth is its own brand surface, separate from
 * the (app) group's theme.
 */

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen(mode: 'light' | 'dark') {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider mode={mode}>
        <OnboardingScreen />
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

beforeAll(async () => {
  await initI18n();
});

it.each(['dark', 'light'] as const)(
  'renders the hero copy and every CTA once assets resolve (%s mode)',
  async mode => {
    renderScreen(mode);

    expect(await screen.findByText('OneAI', { exact: false }, { timeout: 9000 })).toBeTruthy();
    expect(screen.getByText('Hub')).toBeTruthy();
    expect(screen.getByText('Your All-in-One AI Assistant')).toBeTruthy();
    expect(screen.getByText('Continue with Google')).toBeTruthy();
    expect(screen.getByText('Continue with Apple')).toBeTruthy();
    expect(screen.getByText('Log in or sign up')).toBeTruthy();
  },
);

it('paints text in the dark palette regardless of the resolved theme (auth is locked to dark, dark mode)', async () => {
  renderScreen('dark');

  // The wordmark is two-tone: "OneAI" in the accent colour, "Hub" in
  // textPrimary. The auth subtree is locked to dark (see palette.ts), so the
  // values come from THEMES.dark.color.* — the proof that the screen paints
  // a deliberate brand surface, not the platform default.
  const titleLead = await screen.findByText('OneAI', { exact: false }, { timeout: 9000 });
  expect(styleOf(titleLead).color).toBe(THEMES.dark.color.accent);
  expect(styleOf(screen.getByText('Hub')).color).toBe(THEMES.dark.color.textPrimary);

  expect(styleOf(screen.getByText('Your All-in-One AI Assistant')).color).toBe(THEMES.dark.color.textPrimary);
});

it('paints text in the dark palette regardless of the resolved theme (auth is locked to dark)', async () => {
  renderScreen('light');

  // The auth subtree is LOCKED to dark — see src/features/auth/palette.ts and
  // the auth subtree contract in src/features/auth/index.ts. Even when the
  // (app) group's theme resolves to light (and the test wraps the screen in
  // <ThemeProvider mode="light">), the OnboardingScreen still paints from
  // THEMES.dark.color.*. The wordmark's "OneAI" therefore still reads as the
  // dark accent (#BE7A43), and the rest of the text as the dark textPrimary
  // (#F7F7F7) — different hexes from the light palette, and the proof that
  // auth did not leak through to the resolved theme.
  const titleLead = await screen.findByText('OneAI', { exact: false }, { timeout: 9000 });
  expect(styleOf(titleLead).color).toBe(THEMES.dark.color.accent);
  expect(styleOf(screen.getByText('Hub')).color).toBe(THEMES.dark.color.textPrimary);

  expect(styleOf(screen.getByText('Your All-in-One AI Assistant')).color).toBe(
    THEMES.dark.color.textPrimary,
  );
});
