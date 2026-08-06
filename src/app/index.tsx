import React, { useCallback, useMemo, useState } from 'react';
import { Redirect } from 'expo-router';

import { restoreAuthSession, SplashScreen, whenAuthFlowHydrated } from '@/features/auth';
import { useAppBootstrap, type BootstrapTask } from '@/shared/bootstrap';
import { loadApiBaseUrlOverride } from '@/shared/api/baseUrl';
import type { AuthSession } from '@/shared/auth';

/*
 * "/" — the splash route, and the app's entry point.
 *
 * The route renders the animated brand splash while bootstrap work runs,
 * validates the encrypted session, then hands off to home or login. Protected
 * screens are never mounted before that server-backed check completes.
 *
 * <Redirect> rather than router.replace() in an effect: Redirect runs during
 * render, so there is no frame where the splash has finished but the next route
 * has not been requested yet. It also REPLACES rather than pushes, so the
 * splash is not left on the back stack — an Android back press from onboarding
 * exits the app instead of replaying the boot animation.
 *
 * Onboarding remains an explicit auth-flow route; missing, expired, or rejected
 * credentials always land on login.
 */
/*
 * Feature-owned boot work, injected here because this route is the composition
 * root: shared/bootstrap must not import from features/, but a route may import
 * both. whenAuthFlowHydrated reads the persisted auth flow back from
 * AsyncStorage, so the splash absorbs that round-trip and /password |
 * /verify-email never mount before their state is known. The API base URL
 * override (loadApiBaseUrlOverride) joins the same list — it caches whatever
 * the user entered on the Server Settings screen so every subsequent request
 * can resolve the URL synchronously.
 *
 * Module-level constant so the array identity is stable across renders.
 */
export default function SplashRoute(): React.JSX.Element {
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);
  const restoreSession = useCallback(async () => {
    setSession(await restoreAuthSession());
  }, []);
  const bootTasks = useMemo<readonly BootstrapTask[]>(
    () => [whenAuthFlowHydrated, restoreSession, loadApiBaseUrlOverride],
    [restoreSession],
  );
  const { booted } = useAppBootstrap(bootTasks);

  if (booted) return <Redirect href={session ? '/home' : '/login'} />;

  return <SplashScreen />;
}
