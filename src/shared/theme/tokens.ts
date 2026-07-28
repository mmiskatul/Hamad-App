/*
 * Design tokens for the ADAPTIVE part of the app (everything outside the auth
 * subtree, which is fixed-palette — see src/features/auth/index.ts).
 *
 * Names mirror the Figma variables exactly, so a value can be traced back to the
 * inspector without a translation table:
 *   bg/canvas  bg/surface  bg/muted
 *   text/primary  text/secondary
 *   action/primary  action/primary-transparent
 *   border/default  border/strong  border/focus
 *
 * LIGHT values are the resolved Figma variables of the Chat frame (node
 * 404:1772, get_variable_defs).
 *
 * DARK values are now READ FROM THE DARK FIGMA FRAMES (get_variable_defs on
 * 136:2246 Chat and 142:496 Usage dashboard), replacing the set that had been
 * sampled off a phone render. Three were wrong and are corrected here:
 *   textSecondary  #8C8C8E  -> #AAAAAC    (the sampled one was too dim)
 *   accent         #A05F28  -> #BE7A43    (dark uses the brighter accent)
 *   danger         #D11C1F  -> #F3413B
 * canvas / surface / textPrimary / borders / focus were already right.
 *
 * WHY muted IS OPAQUE (#343436) AND NOT THE FIGMA #65656766: the Figma variable
 * is #656567 at 40% alpha, which composites to ~#343436 over the canvas. But a
 * TRANSLUCENT fill takes its final colour from whatever is painted BEHIND it, and
 * on a theme switch the native screen backdrop (React Navigation / Appearance)
 * and the JS-rendered pill repaint on DIFFERENT clocks — so for a frame the
 * translucent pill composites over the *new* palette's backdrop while still
 * carrying the *old* palette's tint, and reads grey one moment, near-white the
 * next. Every muted pill (model selector, icon buttons, back affordance) flickers
 * on every screen. Baking the composited value (#343436) makes the fill
 * deterministic — identical on the canvas, no dependency on the backdrop or the
 * transition timing. It sits marginally lighter than bg/surface (#2E2E2F), so it
 * still lifts when a muted circle sits on a surface card.
 *
 * Kept in sync with global.css (:root / .dark). This module is the source of
 * truth for JS/inline styles, which is how this codebase styles screens; the CSS
 * vars serve the NativeWind utility classes. Change both together.
 */
export type ThemeMode = 'light' | 'dark';

export type ThemeColors = {
  /** App background. */
  canvas: string;
  /** Raised surface: cards, the composer. */
  surface: string;
  /** Quiet fill: pills, icon buttons. */
  muted: string;
  /** Primary text. */
  textPrimary: string;
  /** De-emphasised text, placeholders. */
  textSecondary: string;
  /** Text/icons on an accent fill. */
  textOnAccent: string;
  /** Brand accent. */
  accent: string;
  /** Accent at low alpha — ripples, pressed accent surfaces. */
  accentSoft: string;
  /** Solid tinted accent fill (Figma upgrade card's Business CTA #FFDCC4). */
  accentTint: string;
  /** Label on `accentTint`. */
  textOnAccentTint: string;
  /** Inverted surface — the "Current Plan" button (bg/surface-inverse). */
  surfaceInverse: string;
  /** Label on `surfaceInverse` (text/inverse). */
  textInverse: string;
  /** Scrim behind drawers, sheets and dialogs. */
  overlay: string;
  /**
   * Scrim used when the background is ALSO blurred (shared/ui/Overlay). The blur
   * already separates foreground from background, so the tint only has to stop
   * bright content bleeding through — the full `overlay` on top of a blur reads
   * as a flat black sheet and throws the blur away.
   */
  overlayBlur: string;
  /** Default hairline. */
  border: string;
  /** Stronger hairline (inputs). */
  borderStrong: string;
  /** Focus ring. */
  borderFocus: string;
  danger: string;
  success: string;
};

const LIGHT: ThemeColors = {
  canvas: '#EEEEEF',
  surface: '#F7F7F7',
  muted: '#DEDEDF',
  textPrimary: '#2E2E2F',
  textSecondary: '#8C8C8E',
  textOnAccent: '#F7F7F7',
  accent: '#A05F28',
  accentSoft: '#DE996533',
  accentTint: '#FFDCC4',
  textOnAccentTint: '#A9662E',
  surfaceInverse: '#2E2E2F',
  textInverse: '#EEEEEF',
  overlay: 'rgba(46,46,47,0.42)',
  overlayBlur: 'rgba(46,46,47,0.18)',
  border: '#C7C7C9',
  borderStrong: '#8C8C8E',
  borderFocus: '#BE7A43',
  danger: '#D11C1F',
  success: '#008A34',
};

const DARK: ThemeColors = {
  canvas: '#141415',
  surface: '#2E2E2F',
  muted: '#343436',
  textPrimary: '#F7F7F7',
  textSecondary: '#AAAAAC',
  textOnAccent: '#F7F7F7',
  accent: '#BE7A43',
  accentSoft: '#DE996533',
  // Dark has no Figma frame for the tinted CTA: the flat #FFDCC4 would glare on
  // #141415, so it becomes a translucent accent wash.
  accentTint: 'rgba(190,122,67,0.24)',
  textOnAccentTint: '#DE9965',
  surfaceInverse: '#EEEEEF',
  textInverse: '#2E2E2F',
  overlay: 'rgba(0,0,0,0.55)',
  overlayBlur: 'rgba(0,0,0,0.32)',
  border: '#424243',
  borderStrong: '#585859',
  borderFocus: '#DE9965',
  danger: '#F3413B',
  success: '#2E7D32',
};

/* Figma type ramp (Roboto). lineHeight included so text boxes match the design. */
export const TYPE = {
  h1: { fontSize: 49, lineHeight: 59, letterSpacing: -0.49, fontWeight: '700' },
  h3: { fontSize: 31, lineHeight: 37, letterSpacing: -0.31, fontWeight: '400' },
  h4: { fontSize: 25, lineHeight: 30, letterSpacing: -0.25, fontWeight: '400' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 20, fontWeight: '400' },
  tag: { fontSize: 11, lineHeight: 15, letterSpacing: 0.66, fontWeight: '400' },
} as const;

/* Figma radius scale (sm 4, md 8, lg 12) + the full pill used by every button. */
export const RADIUS = { sm: 4, md: 8, lg: 12, xl: 16, pill: 9999 } as const;

/* Figma grid: 16pt margin / gutter, 4pt base unit. */
export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 44 } as const;

export type Theme = {
  mode: ThemeMode;
  color: ThemeColors;
  type: typeof TYPE;
  radius: typeof RADIUS;
  space: typeof SPACE;
};

export const THEMES: Record<ThemeMode, Theme> = {
  light: { mode: 'light', color: LIGHT, type: TYPE, radius: RADIUS, space: SPACE },
  dark: { mode: 'dark', color: DARK, type: TYPE, radius: RADIUS, space: SPACE },
};
