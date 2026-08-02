/*
 * Auth feature — public surface.
 *
 * CONTRACT (revised 2026-07-24, see PROJECT_TRACKER FUTURE #2): the auth
 * subtree is LOCKED TO DARK. Every screen and component here is painted from
 * `THEMES.dark.color.*`, regardless of the user's light/dark preference and
 * regardless of the OS scheme. The user-facing reason is that the auth flow
 * is the brand entry experience — splash, onboarding, login, OTP, signup,
 * password reset — and a brand canvas that flips with the rest of the app
 * reads as drift on first open. The (app) subtree continues to flip with
 * the user's preference (defaulting to system), so once the user lands on
 * /home the palette they chose takes over.
 *
 * History (so the next session knows what the dead ends are):
 *   1. Originally the auth screens used a frozen `AUTH_COLORS` literal —
 *      a module-scope dump of the Figma Auth frame (#1F1F20 canvas,
 *      #2E2E2F surface). Auth never flipped, by design.
 *   2. The literal was removed and `useAuthPalette()` was introduced to
 *      source values from the resolved adaptive theme. Auth then flipped
 *      with the rest of the app, but the team found this surprising on
 *      first open — a user who picked dark and signed out saw a light
 *      auth canvas because the OS scheme happened to be light.
 *   3. (This file, current state.) `useAuthPalette()` returns the dark
 *      palette unconditionally. The hook signature is unchanged so call
 *      sites still write `const palette = useAuthPalette();` and read
 *      `palette.canvas`, etc. — auth stays locked to dark with zero
 *      call-site churn.
 *
 * Rules for this subtree:
 *   - DO use `useAuthPalette()` for colours. The palette is locked to dark,
 *     so every component paints from the brand surface regardless of theme.
 *   - DO NOT import a frozen `AUTH_COLORS` constant — that literal is gone.
 *     If a non-React-tree site (e.g. a navigation container `contentStyle`)
 *     needs a literal canvas, it must come from `THEMES.dark.color.canvas`
 *     at that moment.
 *   - DO NOT introduce a per-screen light/dark override. The whole subtree
 *     stays on one palette.
 *
 * Boot flow (per user direction, 2026-07-20):
 *   Splash -> Onboarding, routed by Expo Router. "/" (src/app/index.tsx) renders
 *   SplashScreen until useAppBootstrap reports booted, then <Redirect> hands off
 *   to "/onboarding" in the (auth) group.
 *
 *   The skeleton is NOT a route — OnboardingScreen owns it. The screen preloads
 *   its own assets and renders OnboardingScreenSkeleton through <ScreenGate>
 *   (src/shared/loading) until they resolve. Every screen added to this feature
 *   must follow the same pattern: routing picks the screen, the screen decides
 *   whether it is ready to paint.
 *
 * Screens are consumed by thin route files under src/app — they must stay
 * exported here, since route files bind URLs to this public API and never reach
 * into the feature's internals.
 */

/*
 * Auth-flow state (Zustand + AsyncStorage) — the login screen's email-check
 * result, read by /password and /verify-email. `whenAuthFlowHydrated` is a
 * bootstrap task: src/app/index.tsx passes it to useAppBootstrap so the splash
 * absorbs the storage read. See store/authFlowStore.ts for the full contract.
 */
export { useAuthFlowStore, whenAuthFlowHydrated, AUTH_FLOW_STORAGE_KEY } from './store/authFlowStore';
export type { AuthFlowState, AuthIntent } from './store/authFlowStore';
export { restoreAuthSession } from './api/restoreSession';

export { default as SplashScreen } from './screens/SplashScreen';
export { default as OnboardingScreen } from './screens/OnboardingScreen';
export { default as OnboardingScreenSkeleton } from './components/OnboardingScreenSkeleton';
export { default as LoginScreen } from './screens/LoginScreen';
export { default as PasswordScreen } from './screens/PasswordScreen';
export { default as VerifyEmailScreen } from './screens/VerifyEmailScreen';
export { default as SignupScreen } from './screens/SignupScreen';
export { default as NewPasswordScreen } from './screens/NewPasswordScreen';
export { default as ChangePasswordScreen } from './screens/ChangePasswordScreen';
export { useAuthPalette, useAuthRipple, type AuthPalette, type AuthRipple } from './palette';
export { AUTH_TYPE } from './constants';
