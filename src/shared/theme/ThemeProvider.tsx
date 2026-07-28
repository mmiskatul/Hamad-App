import React, { createContext, useCallback, useContext } from 'react';
import { useColorScheme } from 'react-native';

import { useThemeStore } from './themeStore';
import { THEMES, type Theme, type ThemeMode } from './tokens';

/*
 * useTheme() — the ONLY way adaptive screens get colors and type (CLAUDE.md
 * rule #1: never hardcode colors/font sizes).
 *
 * Mode resolution, most specific first:
 *   1. the `mode` prop           — tests and the Figma light/dark comparison
 *   2. the stored preference     — the in-app sun/moon switch (themeStore)
 *   3. the OS colour scheme      — app.json sets userInterfaceStyle "automatic"
 *
 * NOT used by src/features/auth: that subtree is a fixed-palette brand surface
 * and must not flip with the OS (contract in src/features/auth/index.ts). The
 * auth layout does not mount this provider's values into its screens.
 *
 * THE STORED PREFERENCE IS ALSO PUSHED TO `Appearance`, and that is not
 * optional. This app has TWO styling channels — inline styles from these tokens,
 * and NativeWind utility classes resolving `--color-*` from global.css. Only the
 * first one reads themeStore; NativeWind picks `.dark` from the OS scheme via
 * RN's Appearance. Without the sync below, tapping the in-app sun/moon flips
 * every inline style and NOTHING that is class-driven, so the two halves of the
 * palette silently disagree — the class-driven half stays in the OS's palette.
 * Writing the preference into Appearance makes one switch drive both.
 *
 * SYNC-AT-WRITE: Appearance.setColorScheme is called synchronously inside
 * `themeStore.setPreference` (not in an effect here), so the class-driven half
 * starts re-resolving in the SAME event-loop tick as the Zustand store write.
 *
 * `useColorScheme()` IS CALLED HERE, INTENTIONALLY. `react-native-css` (which
 * drives NativeWind class resolution) listens for `Appearance.addChangeListener`
 * — it does not poll. The `useColorScheme()` hook wraps the same native
 * subscription and re-renders this provider every time the listener fires, which
 * is exactly when the class-driven subtree needs to re-read --color-* against
 * the new Appearance value. Removing the hook (the previous attempt) breaks
 * this bridge and the class-driven half waits for Android to schedule a redraw.
 *
 * Why this is NOT a flicker on `system`: the listener fires when the OS scheme
 * flips, NOT when the user taps the toggle. The flicker was caused by the
 * earlier `useEffect(() => Appearance.setColorScheme(...), [preference])` which
 * fired during React's commit phase on Android — that effect is gone. The
 * `useColorScheme()` subscription alone is the right primitive: native fires,
 * JS re-renders, --color-* re-resolves.
 */
const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({
  children,
  mode,
}: {
  children: React.ReactNode;
  /** Force a mode; omit to use the stored preference, then the OS. */
  mode?: ThemeMode;
}): React.JSX.Element {
  const preference = useThemeStore((state) => state.preference);
  // Subscribe to OS-scheme changes via the same native listener that
  // `react-native-css` subscribes to. This makes the class-driven subtree
  // re-render in the same commit the listener fires — the inline half
  // already re-renders synchronously via the Zustand `preference` subscriber.
  // The OS value itself is only used to seed the `system` resolution.
  const osScheme = useColorScheme();

  // Default to dark: the brand is a dark-first product and an undefined scheme
  // (Expo Go on some Android builds returns null) should not flash a light app.
  const fromSystem: ThemeMode = osScheme === 'light' ? 'light' : 'dark';
  const resolved: ThemeMode = mode ?? (preference === 'system' ? fromSystem : preference);

  // Spread to a fresh object so the context value has a stable identity per
  // mode but flips reference when `resolved` changes. The provider re-renders
  // on any subscription change (preference, osScheme), so this object is
  // rebuilt exactly when the JS tree needs a new palette.
  const theme: Theme = { ...THEMES[resolved], mode: resolved };

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  // Falling back instead of throwing keeps a component renderable in isolation
  // (Storybook-style previews, unit tests) without every test wiring a provider.
  return theme ?? THEMES.dark;
}

/*
 * The light/dark switch itself. `mode` is the mode currently ON SCREEN (whatever
 * produced it), so the control can label itself by what tapping it does — that
 * is why the toggle derives its next value from the resolved mode rather than
 * from the stored preference, which may still be 'system'.
 */
export function useThemeToggle(): { mode: ThemeMode; toggle: () => void } {
  const { mode } = useTheme();
  const setPreference = useThemeStore((state) => state.setPreference);

  const toggle = useCallback(() => {
    setPreference(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setPreference]);

  return { mode, toggle };
}