import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar, View } from 'react-native';
import {
  ThemeProvider as NavigationThemeProvider,
  DarkTheme,
  DefaultTheme,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { Redirect, Stack } from 'expo-router';

import { restoreAuthSession } from '@/features/auth';
import { refreshConversations } from '@/features/chat';
import { refreshProjects } from '@/features/projects';
import { refreshModelCatalogue } from '@/shared/models';
import { ThemeProvider, useTheme } from '@/shared/theme';
import { refreshUsageSnapshot } from '@/shared/usage';

export default function AppLayout(): React.JSX.Element {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    restoreAuthSession()
      .then((session) => {
        if (mounted) setAuthenticated(Boolean(session));
      })
      .catch(() => {
        // Session storage/validation failures fail closed: protected screens
        // must never render when authentication cannot be established.
        if (mounted) setAuthenticated(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Never render protected content while session validation is in flight.
  if (authenticated === null) {
    return <View style={{ flex: 1, backgroundColor: '#1F1F20' }} />;
  }
  if (!authenticated) return <Redirect href="/login" />;

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
    Promise.allSettled([
      refreshUsageSnapshot(),
      refreshModelCatalogue(),
      refreshProjects(),
      refreshConversations(),
    ]);
  }, []);

  return null;
}
