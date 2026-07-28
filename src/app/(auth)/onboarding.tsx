import { OnboardingScreen } from '@/features/auth';

/*
 * "/onboarding" — the auth entry screen.
 *
 * Route files are thin bindings: they map a URL to a feature's public API and
 * hold no UI of their own. The screen itself lives in the auth feature module,
 * is exported through its index.ts, and owns its own loading behaviour (it
 * preloads its assets and renders OnboardingScreenSkeleton through ScreenGate).
 * Routing decides WHICH screen; the screen decides whether it is ready to paint.
 */
export default OnboardingScreen;
