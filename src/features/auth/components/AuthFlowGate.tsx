import React from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';

import AuthBackdrop from './AuthBackdrop';
import { useAuthPalette } from '../palette';
import { useAuthFlowStore } from '../store/authFlowStore';

/*
 * Gate for the screens that only make sense mid-flow (/password, /verify-email).
 *
 * Three states, in order:
 *   1. Store not hydrated yet → render the screen's own canvas + backdrop.
 *      NOT a spinner and NOT partial content: the atmospheric layers are
 *      identical to the real screen, so when the form appears it reads as a
 *      content swap. On the normal path this is never seen — useAppBootstrap
 *      awaits whenAuthFlowHydrated() before the splash hands off, so hydration
 *      is finished long before /password can mount. It exists for deep links,
 *      which mount an auth route directly and skip "/" entirely.
 *      (Why not <ScreenGate>: its contract is a layout-matching SKELETON for
 *      assets/network waits. These two screens have no skeleton yet, and the
 *      wait here is a single local AsyncStorage read. When they get skeletons,
 *      this branch should become a ScreenGate — see PROJECT_TRACKER.)
 *   2. Hydrated with no email → <Redirect href="/login" />. Deep-linking to
 *      /password without a flow used to render a password form that could never
 *      submit; now it sends the user to the step that produces the state.
 *      Redirect (not router.replace in an effect) for the reason in CLAUDE.md:
 *      it runs during render, so there is no frame of the wrong screen.
 *   3. Hydrated with an email → render the screen. Children may therefore assume
 *      `email` is non-null, exactly like ScreenGate's children may assume their
 *      assets exist.
 *
 * THEME: the auth subtree follows the adaptive theme (see src/features/auth/index.ts).
 * The pre-hydration shell paints the resolved palette canvas so the swap from
 * shell to form does not flash a contrasting colour.
 */
export default function AuthFlowGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const hasHydrated = useAuthFlowStore(state => state.hasHydrated);
  const email = useAuthFlowStore(state => state.email);
  const palette = useAuthPalette();

  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.canvas }} testID="auth-flow-shell">
        <AuthBackdrop />
      </View>
    );
  }

  if (!email) return <Redirect href="/login" />;

  return <>{children}</>;
}
