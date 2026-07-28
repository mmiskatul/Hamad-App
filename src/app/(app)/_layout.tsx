import React, { useMemo } from 'react';
import { StatusBar } from 'react-native';
import {
  ThemeProvider as NavigationThemeProvider,
  DarkTheme,
  DefaultTheme,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { Stack } from 'expo-router';

import { ThemeProvider, useTheme } from '@/shared/theme';

/*
 * Authenticated app layout. The (app) group gives the post-login screens their
 * own stack without adding a URL segment — "/home", not "/(app)/home".
 *
 * THEME: this group is ADAPTIVE (light + dark). ThemeProvider is mounted HERE
 * (and mirrored in (auth)/_layout.tsx) so each subtree resolves the same theme
 * independently — the root layout does NOT mount one. The inner component
 * exists because contentStyle needs the resolved theme, which is only
 * available BELOW the provider.
 *
 * STATUS BAR + NAV THEME: the root layout sets both to the adaptive palette.
 * Here we OVERRIDE them per the resolved theme:
 *   - StatusBar flips barStyle between light-content (dark mode) and
 *     dark-content (light mode), so status-bar icons are always visible.
 *   - React Navigation's own ThemeProvider is set to match the active palette,
 *     so the navigation container background (visible during screen transitions)
 *     uses the correct canvas colour instead of the root layout's dark
 *     fallback.
 *
 * The conversation drawer and the rest of the Core section (Figma 140:1059, 32
 * screens) become siblings in this folder — each new file is a route.
 */
export default function AppLayout(): React.JSX.Element {
  return (
    <ThemeProvider>
      <AppStack />
    </ThemeProvider>
  );
}

function AppStack(): React.JSX.Element {
  const theme = useTheme();
  const isDark = theme.mode === 'dark';

  /*
   * Derive a React Navigation theme from the resolved adaptive palette. This
   * controls the container background shown during push/pop transitions and the
   * default card/header colours (we hide headers, but the background matters).
   */
  const navTheme: NavTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      dark: isDark,
      colors: {
        ...(isDark ? DarkTheme : DefaultTheme).colors,
        background: theme.color.canvas,
        card: theme.color.surface,
        text: theme.color.textPrimary,
        border: theme.color.border,
        primary: theme.color.accent,
        notification: theme.color.accent,
      },
    }),
    [isDark, theme.color],
  );

  return (
    <NavigationThemeProvider value={navTheme}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.color.canvas },
        }}
      >
        {/*
         * Upgrade is a modal presentation: it slides up over the chat and keeps it
         * mounted underneath, which is what "a modal opens" means for a full-page
         * plan comparison reached from three different places.
         */}
        <Stack.Screen name="upgrade" options={{ presentation: 'modal' }} />
      </Stack>
    </NavigationThemeProvider>
  );
}
