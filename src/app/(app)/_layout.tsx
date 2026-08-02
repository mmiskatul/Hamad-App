import React, { useEffect, useMemo } from 'react';
import { StatusBar } from 'react-native';
import {
  ThemeProvider as NavigationThemeProvider,
  DarkTheme,
  DefaultTheme,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { Stack } from 'expo-router';

import { refreshConversations } from '@/features/chat/api/conversationApi';
import { refreshProjects } from '@/features/projects/projectApi';
import { refreshModelCatalogue } from '@/shared/models';
import { ThemeProvider, useTheme } from '@/shared/theme';
import { refreshUsageSnapshot } from '@/shared/usage';

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
      <AuthenticatedBackendSync />
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
        <Stack.Screen name="upgrade" options={{ presentation: 'modal' }} />
      </Stack>
    </NavigationThemeProvider>
  );
}

function AuthenticatedBackendSync(): null {
  useEffect(() => {
    void Promise.allSettled([
      refreshUsageSnapshot(),
      refreshModelCatalogue(),
      refreshProjects(),
      refreshConversations(),
    ]);
  }, []);

  return null;
}