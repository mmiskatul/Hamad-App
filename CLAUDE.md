# Mobile app — Claude Code Guide

## Working directive

- **Decide autonomously.** If ambiguity, a technical constraint, or a business-logic roadblock arises, do NOT stop to ask — make the definitive decision using industry best practices and document the rationale.

**Before doing any work in this directory, read `PROJECT_TRACKER.txt` first.** It tracks what's already been built (past), the current state of the repo including anything uncommitted or unverified (present), and what's planned next (future). Update it — don't just append — when you finish a chunk of work, so the next session knows where things stand.

Expo SDK 54 (RN 0.81, React 19, CNG — do NOT commit android/ios folders). NativeWind v5 + Tailwind CSS v4 for ALL styling. TypeScript strict. Path alias `@/* → src/*` (tsconfig paths; no babel config needed). STRICT FEATURE MODULES. Env vars: `EXPO_PUBLIC_*` only.

## Module rules (enforced by ESLint)
- A feature may import from `@/shared/*` and its OWN folder — never from another feature's internals.
- Each feature exposes a public API via its `index.ts`; navigation imports screens from there.
- If two features need the same code → move it to `shared/`, don't cross-import.
- Raw `<Text>` is forbidden — use `AppText` from `@/shared/ui`.

## Theming — one adaptive palette across the app
- The whole app — auth subtree included — is ADAPTIVE and consumes the shared theme. Auth screens get their palette via `useAuthPalette()` (which reads `useTheme()` from `@/shared/theme`), so the auth flow flips with the user's light/dark preference in lockstep with the chat. The historical `AUTH_COLORS` literal was removed in 2026-07-24 — see `src/features/auth/index.ts` for the current contract.
- Token names mirror the Figma variables (`bg/canvas` → `color.canvas`, `text/primary` → `color.textPrimary`, …) so a value traces back to the inspector.
- `ThemeProvider` is mounted in **both** `src/app/(auth)/_layout.tsx` and `src/app/(app)/_layout.tsx`. Each group installs its own provider so the auth stack and the app stack resolve the same theme independently — neither subtree imports the other's provider. Each provider takes a `mode` override, which is how tests assert both palettes.
- `src/shared/theme/tokens.ts` (JS, for inline styles) and `global.css` `:root`/`.dark` (for NativeWind classes) hold the same values — **change them together**.
- The auth subtree (splash, onboarding, login, OTP, signup, password screens) is a separate brand surface that is **LOCKED TO DARK** — it always paints from `THEMES.dark.color.*` regardless of the user's light/dark preference or the OS scheme. Auth screens read their palette via `useAuthPalette()` (src/features/auth/palette.ts), which returns the dark palette unconditionally. The (app) subtree continues to flip with the user's preference (defaulting to system). This split keeps the brand entry experience stable on first open while letting the rest of the app adapt to the user's preference.
- A screen the whole app shares (the brand logo, a primitive) belongs in `shared/ui`, not in whichever feature needed it first: features cannot import each other. `HexLogo` moved out of auth for exactly this reason.

## Overlays — drawer, sheet, dialog, popover
- All of them build on `shared/ui/Overlay`, which owns mount lifetime (stays mounted through the exit animation, unmounted by the animation's own completion callback — never a JS timer), the scrim (tap = dismiss), and Android hardware Back. Children drive their transform from the `progress` shared value it hands down, so scrim and content share one clock.
- `Sheet` (bottom, drag-to-dismiss) and `Dialog` (centred, scale-in) are the ready-made surfaces. A new overlay composes `Overlay` rather than reaching for `Modal` directly.
- **Only one overlay may be open at a time.** Screens hold a single `surface` state value, not one boolean per surface — two scrims stacked is a trapped user.
- Dismissal is always available three ways: scrim tap, Back, and the surface's own affordance (✕ or a drag). Gesture thresholds combine distance AND velocity, so a fast flick works as well as a long drag.
- Directional surfaces (drawers, anchored menus) derive edge, travel direction and rounded corner from `I18nManager.isRTL` in one place, and use `start`/`end` (`borderTopEndRadius`, …) everywhere else.

## Icon library — Hugeicons (project-wide rule)
- The ONLY icon library used in this app is **Hugeicons**: `@hugeicons/react-native` (renderer) + `@hugeicons/core-free-icons` (icon set) + `react-native-svg` (peer). Both `@hugeicons/core-free-icons` and `react-native-svg` are required deps.
- Do NOT import `@expo/vector-icons` (Ionicons / Material / FontAwesome / etc.) anywhere. Replace any existing `Ionicons` / `MaterialIcons` / `FontAwesome` usage with `HugeiconsIcon` from `@hugeicons/react-native` and the matching icon from `@hugeicons/core-free-icons` (e.g., `GoogleIcon`, `Apple01Icon`, `ViewIcon`, `ViewOffSlashIcon`, `GlobeIcon`).
- Wrap the raw renderer in a thin `Icon` component under `src/shared/ui/Icon.tsx` so all callers don't have to import both packages; features import `Icon` from `@/shared/ui` and pass the icon component as a prop or string token.
- Icon sizing/color come from tokens (`useTheme()`), not magic numbers; brand-coloured icons (Google/Apple) explicitly use their brand hex (`#4285F4` Google, `#ffffff` Apple on dark) — they stay brand-coloured regardless of the adaptive palette.

## Conventions
- Server state → TanStack Query (feature `api/` + `hooks/`); client state → Zustand (feature `store/`). No Redux.
- **Persisted Zustand stores hydrate ASYNCHRONOUSLY.** A store using `persist` + AsyncStorage reads null on the first frame even when a value is stored, so never branch (redirect, gate, fork) on its contents before its `hasHydrated` flag is true — you will bounce returning users. Canonical example: `features/auth/store/authFlowStore.ts` + `AuthFlowGate`. Two defences, use both: expose a `when…Hydrated()` bootstrap task (injected into `useAppBootstrap` from `src/app/index.tsx`, since `shared/` must not import a feature) so the splash absorbs the read, and gate the screens for deep links, which skip `/` entirely. Hydration waits are fail-open — a storage read that never answers must not trap the user.
- Multi-screen flows keep their state in ONE feature store, not in route params: params duplicate the source of truth and let a deep link open a screen mid-flow with nothing to submit. A screen that needs flow state gates on it and redirects to the step that produces it.
- Persisted stores are unencrypted disk. Credentials (passwords, OTP codes, tokens) never go in them — `react-native-keychain` does.
- Styling: inline objects from `useTheme()` tokens. No magic numbers; `start`/`end` for RTL safety.
- Tests co-located in `__tests__/` next to source. Jest + Testing Library.

## Routing — Expo Router (file-based)
- **Routing is file-based via Expo Router v6.** Entry point is `"main": "expo-router/entry"` in package.json — there is no `App.tsx` and no `NavigationContainer` (Expo Router owns it; mounting a second one throws).
- **EVERY file in `src/app/` is a route.** Hooks, helpers, constants and components must NOT live there — put them in `shared/` or a feature module and import them. A stray non-route module is treated as a screen and warns about a missing default export. (`__tests__/` and `*.test.tsx` are excluded by Expo Router's default ignore — verified: adding them left the bundle hash unchanged.)
- **Route files are thin bindings** — they map a URL to a feature's public API (`export default OnboardingScreen`) and hold no UI. Screens live in `src/features/<feature>/screens/` and are exported through the feature's `index.ts`.
- Parenthesised folders are **groups**: `(auth)` gives the auth flow its own layout without adding a URL segment, so the route is `/onboarding`, not `/(auth)/onboarding`. New auth screens become routes just by adding a file to `(auth)/` — no navigator edit.
- **Hand off with `<Redirect href=...>`, not `router.replace()` in an effect.** Redirect runs during render, so there is no frame where the old screen has finished but the next route hasn't been requested; it also replaces rather than pushes, keeping the splash off the back stack.
- Boot work goes in `useAppBootstrap` (`@/shared/bootstrap` — deliberately NOT in `src/app`). It uses `Promise.allSettled`, never `all`: a failed task must not strand the user on the splash. `SPLASH_MIN_DURATION_MS` (2000, matches HexLogo SPIN_MS + REST_MS) is a **floor**, not a delay — fast boots still play the full brand animation.
- Route containers are pinned to `theme.color.canvas` via `contentStyle` **and** a dark `ThemeProvider`, otherwise React Navigation's default light theme flashes white between routes. Each group ((auth), (app)) sets its own `contentStyle` from the resolved theme in its own layout.
- The route tree has a contract test at `src/app/__tests__/routing.test.tsx` that renders the real `src/app` directory via `expo-router/testing-library`. Update it when the tree changes — it is what catches a renamed route or a broken hand-off.
- Expo Router's Jest matchers (`toHavePathname` etc.) are registered at runtime but ship no types; the augmentation lives in `expo-router-env.d.ts` (delete it if a future version ships its own).

## Skeleton loading
- **Global rule: no screen renders partially and no screen shows a bare spinner.** Anything waiting on assets or data — images, i18n, a TanStack Query fetch, keychain session restore — renders a layout-matching skeleton through `<ScreenGate>` from `@/shared/loading`:
  ```tsx
  const { ready } = useAssetPreload(SCREEN_ASSETS);
  const query = useSomeQuery();
  return (
    <ScreenGate ready={ready && !query.isPending} skeleton={<SomeScreenSkeleton />}>
      <SomeScreenContent data={query.data} />
    </ScreenGate>
  );
  ```
  The gated component is the screen's default export; the content component is never mounted before `ready`, so it may assume its assets and data exist. Canonical example: `src/features/auth/screens/OnboardingScreen.tsx`.
- Every skeleton mirrors ITS OWN screen's layout 1:1 (same atmospheric layers, containers, vertical rhythm) so the swap reads as a content swap, not a layout jump. A generic spinner or a shared "loading" screen is not acceptable.
- `useAssetPreload` takes `require()`d **raster** modules only. `.svg` imports are compiled to React components by `react-native-svg-transformer` — already in the bundle, nothing to preload.
- `useAssetPreload` is **fail-open**: on asset error, or after `failOpenAfterMs` (default 8000), it flips `ready` and sets `failed`. Never trap a user on an infinite skeleton because a decorative image 404'd; branch on `failed` if a screen genuinely can't render without it.
- `ScreenGate` timing knobs exist so the skeleton doesn't become the glitch: `delayMs` (suppress the skeleton for loads that resolve instantly) and `minVisibleMs` (default 300 — once shown, hold it so several async sources settling a few ms apart don't strobe).
- The project-wide skeleton primitive is the custom **`src/shared/ui/Shimmer.tsx`** — pure JS on top of `react-native-reanimated` + `expo-linear-gradient` (already in deps). New screens with loading states should compose `Shimmer` blocks rather than reaching for a new dependency. Rationale: mainstream skeleton libraries (`react-native-skeleton-placeholder`, `react-native-auto-skeleton`, etc.) ship native modules that break Expo Go; the custom primitive keeps Expo Go working and the toolchain unchanged. Pair it with derived theme tones (`palette.surface` + a lighten step) inside the auth subtree, which is now adaptive (no theme coupling required).

## Assets (images, fonts, etc.)
- All static assets live at the **project root** under `/assets/<domain>/` (e.g. `/assets/auth/logo.png`, `/assets/auth/welcome-background.png`).
- Reference from source via `require('../../../assets/<domain>/<file>')` — `require()` is the only correct way in Expo SDK 54 + CNG; do NOT put assets under `/public` (that folder is for Expo **web** only and is unreachable from native `require()`).
- `app.json` declares `assetBundlePatterns: ["**/*"]` so Metro bundles the `/assets` tree on native.
- Export raster images as `.png` with @1x/@2x/@3x variants where you need pixel-density support.
- `.svg` assets ARE supported: `react-native-svg-transformer` is wired into `metro.config.js` (+ `svg-env.d.ts` type declaration) — SVGs import as React components (`import Logo from '../../assets/auth/logo.svg'`).

## Figma work
Implementing a Figma link or node? Use the `figma-implement` skill (`.claude/skills/figma-implement/SKILL.md`) — it holds the standing workflow rules and the definition of done for a screen.
