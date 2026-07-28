import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme as cssColorScheme } from 'react-native-css/native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ThemeMode } from './tokens';

/*
 * Appearance preference — the in-app light/dark switch.
 *
 * 'system' (the default) keeps the historical behaviour: follow the OS. Picking
 * light or dark explicitly is an OVERRIDE and outranks the OS from then on,
 * which is what a user means when they tap a sun icon on a dark screen.
 *
 * HYDRATION: this is a persisted store, so `preference` reads 'system' on the
 * first frame even when a value is stored (CLAUDE.md — persisted stores hydrate
 * asynchronously). That is deliberately fail-open here: the worst case is one
 * frame in the OS palette before the stored choice lands, never a wrong route.
 * Nothing may branch navigation on this value.
 *
 * SYNC-AT-WRITE: this app has TWO styling channels that have to flip in the
 * SAME React render:
 *
 *   1. Inline styles — read `themeStore.preference` via `useTheme()`.
 *      Synchronously notified by `set({ preference })`.
 *
 *   2. NativeWind utility classes — every `<View>` / `<Text>` / `<Pressable>` /
 *      `<TextInput>` is babel-rewritten by `react-native-css` into a wrapper
 *      that subscribes to the `cssColorScheme` observable (the one driving
 *      the `.dark` selector and the `--color-*` variables from global.css).
 *
 * `Appearance.setColorScheme(...)` is NOT enough on its own. It updates the
 * JS-side cache synchronously, but the `'change'` event that `react-native-css`
 * (and `useColorScheme()`) listen to is delivered by the **native** bridge,
 * and on Android that delivery is queued behind a UI-thread redraw. The
 * inline half flips on the next React render; the class-driven half waits
 * for Android to schedule a redraw — which the user sees as "I have to
 * background and resume the app to see the new colours."
 *
 * The fix is to push directly into the SAME observable `react-native-css`
 * exposes, bypassing the bridge:
 *
 *   - `Appearance.setColorScheme(...)` keeps the RN-side cache in step (for
 *     anyone reading `Appearance.getColorScheme()` outside this tree).
 *   - `cssColorScheme.set(...)` is the actual signal the class-driven subtree
 *     listens to. Its `set()` is a pure-JS `notify()` over a Set of observers
 *     (`reactivity.js`), each of which calls `setState` synchronously.
 *
 * Both calls happen inside `setPreference` so the two halves flip in the
 * SAME event-loop tick with no `useEffect` between them and no async wait.
 * `onRehydrateStorage` mirrors the same pair so persisted preferences land
 * with the same sync-at-write contract.
 */
export type ThemePreference = ThemeMode | 'system';

export const THEME_STORAGE_KEY = 'oneai.theme';

export type ThemeState = {
  preference: ThemePreference;
  hasHydrated: boolean;
  setPreference: (preference: ThemePreference) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      hasHydrated: false,
      setPreference: (preference) => {
        const value: ThemeMode | null = preference === 'system' ? null : preference;
        // 1. Native side — keeps RN's Appearance cache in step.
        Appearance.setColorScheme(value);
        // 2. JS side — bypasses the Android bridge and notifies the
        //    react-native-css observers synchronously.
        cssColorScheme.set(value);
        set({ preference });
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ preference }) => ({ preference }),
      onRehydrateStorage: () => (state, error) => {
        if (state) {
          const value: ThemeMode | null = state.preference === 'system' ? null : state.preference;
          Appearance.setColorScheme(value);
          cssColorScheme.set(value);
        }
        if (error && __DEV__) {
          console.warn('[themeStore] rehydrate failed:', error);
        }
        useThemeStore.setState({ hasHydrated: true });
      },
    },
  ),
);

export default useThemeStore;
