import '../../global.css';
import React, { useMemo } from 'react';
import { StatusBar } from 'react-native';
import { ThemeProvider, DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme } from 'react-native';

import { queryClient } from '@/shared/api/queryClient';

/*
 * Root layout — the app shell. Providers and the top-level Stack, nothing else.
 *
 * Under Expo Router this file replaces the old App.tsx + RootNavigator pair:
 * the entry point is `expo-router/entry` (package.json "main"), which mounts
 * this layout for every route. There is no NavigationContainer here — Expo
 * Router owns it, and mounting a second one would throw.
 *
 * ROUTE TREE (src/app):
 *   index.tsx          → "/"           splash + bootstrap, redirects when booted
 *   (auth)/onboarding  → "/onboarding" the onboarding screen (theme-aware)
 *   (app)/...          → authenticated stack (theme-aware)
 *   +not-found.tsx     → anything else
 * The (auth) and (app) groups keep the segment OUT of the URL while still
 * giving each its own layout — "/onboarding", not "/(auth)/onboarding".
 *
 * EVERY FILE IN src/app IS A ROUTE. Hooks, helpers and components must live in
 * shared/ or in a feature module and be imported here; a stray non-route module
 * in this tree is treated as a screen and warns about a missing default export.
 *
 * THEME: the root layout is THEME-AWARE. Both (auth) and (app) groups mount
 * their own `<ThemeProvider>` and resolve the OS scheme through
 * `useColorScheme()`. The React Navigation `ThemeProvider` here is also
 * adaptive so the navigation container (visible during screen transitions)
 * matches whichever palette the user has selected. `contentStyle` is pinned
 * to a dark fallback so the brief window before the inner provider mounts
 * does not flash white.
 */
export default function RootLayout(): React.JSX.Element {
  const isDark = useColorScheme() !== 'light';
  const navTheme: Theme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      dark: isDark,
      colors: {
        ...(isDark ? DarkTheme : DefaultTheme).colors,
        // Fallback to a dark canvas before the (auth)/(app) provider mounts —
        // every route subtree re-pins `contentStyle` to its own resolved canvas.
        background: '#1F1F20',
        card: '#1F1F20',
        text: isDark ? '#F7F7F7' : '#2E2E2F',
        border: isDark ? '#424243' : '#C7C7C9',
        primary: isDark ? '#BE7A43' : '#A05F28',
        notification: isDark ? '#BE7A43' : '#A05F28',
      },
    }),
    [isDark],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider value={navTheme}>
            <StatusBar
              barStyle={isDark ? 'light-content' : 'dark-content'}
              backgroundColor="transparent"
              translucent
            />
            <Stack
              screenOptions={{
                headerShown: false,
                // Pre-provider fallback: every group overrides this with its
                // own resolved canvas in (auth)/_layout.tsx and (app)/_layout.tsx.
                contentStyle: { backgroundColor: '#1F1F20' },
                animation: 'fade',
              }}
            />
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
