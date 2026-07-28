import { THEMES, type Theme, type ThemeColors } from '@/shared/theme';

/*
 * Auth palette — LOCKED TO DARK.
 *
 * The auth subtree is a brand surface (splash, onboarding, login, OTP, signup,
 * password reset) that does not respond to the user's light/dark preference.
 * It is always painted from `THEMES.dark.color.*`, regardless of what the
 * (app) group's theme is currently set to, and regardless of the OS scheme.
 * The reason: the auth screens are the brand entry experience, and a brand
 * canvas that flips with the rest of the app reads as drift, not as design.
 * This is also what the team decided (PROJECT_TRACKER, 2026-07-24) after a
 * brief period during which auth followed the preference and the team found
 * it surprising on first open.
 *
 * History:
 *   - Original: `AUTH_COLORS` was a frozen Figma Auth frame dump
 *     (#1F1F20 canvas, #2E2E2F surface). All screens imported the literal,
 *     so auth never flipped.
 *   - 2026-07-24: palette was migrated to be sourced from the resolved adaptive
 *     theme via `useTheme()`. Auth screens then flipped with the rest of the
 *     app — but the team found this surprising and asked for the lock.
 *   - This file: returns the dark palette unconditionally. The auth subtree
 *     stays on the brand dark surface while the (app) subtree continues to
 *     flip with the user's preference.
 *
 * The mapping mirrors the Figma Auth frame:
 *   canvas       ↔ theme.color.canvas          (frame background)
 *   surface      ↔ theme.color.surface         (Google / Apple button fill)
 *   onSurface    ↔ theme.color.textPrimary     (button label, headline copy)
 *   accent       ↔ theme.color.accent          (hex ring + "OneAI" wordmark)
 *   accentFocus  ↔ theme.color.borderFocus     (focus ring, active-lang border)
 *   muted        ↔ theme.color.textSecondary   (tagline, subtle copy)
 *   edge         ↔ theme.color.border          (language toggle border)
 *   edgeStrong   ↔ theme.color.borderStrong    (OR divider, rest-state field edge)
 *   danger       ↔ theme.color.danger          (invalid field border + error text)
 *
 * The hook signature is unchanged — call sites still write
 * `const palette = useAuthPalette();` and read `palette.canvas`, etc. — so
 * every screen that previously followed the adaptive theme now sees a fixed
 * dark palette with no code change at the call site.
 */
export type AuthPalette = {
  canvas: string;
  surface: string;
  onSurface: string;
  accent: string;
  accentFocus: string;
  muted: string;
  edge: string;
  edgeStrong: string;
  danger: string;
};

/*
 * Memoised: every auth screen reads the same nine fields from the same
 * source on every render. Building a fresh object per call would invalidate
 * downstream `React.memo` equality checks that key off the palette object
 * (none today, but the contract is stable enough to keep the cost down).
 */
const DARK_AUTH_THEME: Theme = THEMES.dark;
const DARK_AUTH_PALETTE: AuthPalette = paletteFromTheme(DARK_AUTH_THEME);

function paletteFromTheme(theme: Theme): AuthPalette {
  const c: ThemeColors = theme.color;
  return {
    canvas: c.canvas,
    surface: c.surface,
    onSurface: c.textPrimary,
    accent: c.accent,
    accentFocus: c.borderFocus,
    muted: c.textSecondary,
    edge: c.border,
    edgeStrong: c.borderStrong,
    danger: c.danger,
  };
}

/*
 * Returns the auth palette. ALWAYS DARK — see the file header. The argument
 * is accepted for backwards compatibility with callers that still pass
 * `<ThemeProvider mode="...">` for tests, but it is ignored.
 */
export function useAuthPalette(): AuthPalette {
  return DARK_AUTH_PALETTE;
}

/*
 * The AuthRipple has to invert with the surface it lands on: a light ripple
 * on the dark `surface` pill, a dark ripple on a near-white pill. The
 * historical `AUTH_RIPPLE.onDark` / `AUTH_RIPPLE.onLight` literals were
 * tied to the fixed brand canvas; here they are unchanged because the
 * palette no longer flips, and the values still match what the design lands
 * on for the dark auth canvas.
 */
export type AuthRipple = { onDark: string; onLight: string };

export function useAuthRipple(): AuthRipple {
  return {
    onDark: 'rgba(247, 247, 247, 0.18)',
    onLight: 'rgba(46, 46, 47, 0.16)',
  };
}