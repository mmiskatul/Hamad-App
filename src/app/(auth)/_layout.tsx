import React, { useMemo } from 'react';
import { StatusBar } from 'react-native';
import {
  ThemeProvider as NavigationThemeProvider,
  DarkTheme,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { Stack } from 'expo-router';

import { ThemeProvider, THEMES } from '@/shared/theme';

/*
 * Auth flow layout. The (auth) group gives every auth screen a shared stack
 * without adding a URL segment — routes here resolve as "/onboarding", not
 * "/(auth)/onboarding".
 *
 * THEME: the auth subtree is LOCKED TO DARK — see src/features/auth/index.ts
 * for the contract. The auth screens always render with the dark palette
 * regardless of the user's light/dark preference or the OS scheme, so:
 *   - StatusBar is permanently `light-content` (white icons on the dark canvas).
 *   - React Navigation's `ThemeProvider` is permanently `DarkTheme`, with
 *     its `colors.*` overridden to the dark token values.
 *   - `contentStyle` is pinned to the dark canvas so transitions never flash.
 *
 * The inner `<ThemeProvider>` from `@/shared/theme` is still mounted so
 * `useTheme()` calls inside the auth subtree resolve consistently (and
 * tests that wrap a screen with `<ThemeProvider mode="...">` still work).
 * It is harmless here — `useAuthPalette()` ignores the resolved mode and
 * returns `THEMES.dark.color.*` directly, so the auth subtree cannot
 * accidentally read the (app) group's theme.
 */
export default function AuthLayout(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AuthStack />
    </ThemeProvider>
  );
}

function AuthStack(): React.JSX.Element {
  /*
   * Derive a React Navigation theme from the AUTH-LOCKED palette. We read
   * from `THEMES.dark` directly rather than from the resolved `theme` —
   * even if the auth subtree's ThemeProvider somehow flipped (it shouldn't),
   * the nav theme and contentStyle would still come from the dark tokens,
   * because the auth subtree's contract is "always dark" regardless of
   * whatever the resolved theme is.
   */
  const dark = THEMES.dark.color;
  const navTheme: NavTheme = useMemo(
    () => ({
      ...DarkTheme,
      dark: true,
      colors: {
        ...DarkTheme.colors,
        background: dark.canvas,
        card: dark.surface,
        text: dark.textPrimary,
        border: dark.border,
        primary: dark.accent,
        notification: dark.accent,
      },
    }),
    [dark.canvas, dark.surface, dark.textPrimary, dark.border, dark.accent],
  );

  return (
    <NavigationThemeProvider value={navTheme}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: dark.canvas },
        }}
      />
    </NavigationThemeProvider>
  );
}
