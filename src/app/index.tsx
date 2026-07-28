import React from 'react';
import { Redirect } from 'expo-router';

import { SplashScreen, whenAuthFlowHydrated } from '@/features/auth';
import { useAppBootstrap, type BootstrapTask } from '@/shared/bootstrap';

/*
 * "/" — the splash route, and the app's entry point.
 *
 * Requirement (user, 2026-07-20): splash first, then onboarding immediately
 * after. This route renders the animated brand splash while bootstrap work runs
 * (i18n today; keychain session restore later), then hands off.
 *
 * <Redirect> rather than router.replace() in an effect: Redirect runs during
 * render, so there is no frame where the splash has finished but the next route
 * has not been requested yet. It also REPLACES rather than pushes, so the
 * splash is not left on the back stack — an Android back press from onboarding
 * exits the app instead of replaying the boot animation.
 *
 * When auth state exists (tracker FUTURE #3) this is the natural place to fork:
 *   return <Redirect href={session ? '/(tabs)' : '/onboarding'} />;
 */
/*
 * Feature-owned boot work, injected here because this route is the composition
 * root: shared/bootstrap must not import from features/, but a route may import
 * both. whenAuthFlowHydrated reads the persisted auth flow back from
 * AsyncStorage, so the splash absorbs that round-trip and /password |
 * /verify-email never mount before their state is known.
 *
 * Module-level constant so the array identity is stable across renders.
 */
const BOOT_TASKS: readonly BootstrapTask[] = [whenAuthFlowHydrated];

export default function SplashRoute(): React.JSX.Element {
  const { booted } = useAppBootstrap(BOOT_TASKS);

  if (booted) return <Redirect href="/onboarding" />;

  return <SplashScreen />;
}
