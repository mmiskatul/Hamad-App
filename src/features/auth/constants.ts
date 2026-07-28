/*
 * Auth constants — non-palette literals only.
 *
 * The auth subtree is LOCKED TO DARK — every auth screen paints from the
 * dark palette regardless of the user's light/dark preference or the OS
 * scheme (see src/features/auth/index.ts and ./palette.ts). The historical
 * `AUTH_COLORS` module-scope literal was a frozen dump of the same dark
 * palette; that literal was removed and `useAuthPalette()` now returns the
 * dark palette unconditionally. Test fixtures wrap the screen in
 * `<ThemeProvider mode="...">` for backward compatibility, but `mode` is
 * ignored — auth stays dark in every test.
 *
 * What stays here is the type ramp (AUTH_TYPE) — it does not flip with the
 * theme; it is the Figma Roboto ramp and the same numbers in both modes.
 *
 * `AUTH_CANVAS` is kept as a deprecated fallback for the few call sites that
 * cannot call a hook (notably the routing test mock). The
 * `(auth)/_layout.tsx` reads from `THEMES.dark.color.canvas` directly rather
 * than from this deprecated literal, so the navigation container's
 * `contentStyle` matches the auth subtree's locked dark palette. New code
 * MUST NOT import AUTH_CANVAS — use `useAuthPalette().canvas` instead.
 */

/** @deprecated use `useAuthPalette().canvas` for code inside the React tree. */
export const AUTH_CANVAS = '#1F1F20';

/* Figma type ramp (Roboto). lineHeight is included so text boxes match the design. */
export const AUTH_TYPE = {
  h1: { fontSize: 49, lineHeight: 59, letterSpacing: -0.49, fontWeight: '700' },
  h4: { fontSize: 25, lineHeight: 30, letterSpacing: -0.25, fontWeight: '400' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 20, fontWeight: '400' },
  tag: { fontSize: 11, lineHeight: 15, letterSpacing: 0.66, fontWeight: '400' },
} as const;
