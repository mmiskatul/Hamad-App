import React from 'react';
// eslint-disable-next-line no-restricted-imports -- AppText IS the canonical wrapper; this is its only allowed consumer of raw RN Text.
import { Text, type TextProps, type TextStyle } from 'react-native';

/*
 * AppText — the ONLY allowed typography primitive in this app (per CLAUDE.md / ESLint
 * `no-restricted-imports`). Wraps RN `Text`, applies the default text color from the
 * brand canvas, and lets callers compose typography via Tailwind classes
 * (e.g. `text-h3 text-accent font-bold text-center`).
 *
 * Variants are intentionally minimal in this first cut; the full shared/ui primitives
 * (Button, Input, Card, ErrorBoundary, Icon) are rebuilt in the next chunk per the
 * PROJECT_TRACKER rebuild plan.
 */
function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/*
 * Color tokens that a caller can pass as `text-<token>` (mirrors the --color-*
 * entries in global.css). Used to decide whether the default color class is
 * emitted at all.
 *
 * WHY an allowlist instead of just appending the caller's class: Tailwind v4
 * resolves two utilities that set the same property by their order in the
 * GENERATED STYLESHEET, not by the order they appear in the className string.
 * `--color-auth-*` is declared before `--color-content` in global.css, so
 * `.text-content` is emitted later and silently beat `text-auth-accent` /
 * `text-auth-content` — every auth label rendered #2e2e2f on the #1F1F20
 * canvas, i.e. invisible. Omitting the default when the caller already picked
 * a color removes the conflict instead of relying on declaration order.
 */
const COLOR_TOKENS = [
  'canvas',
  'surface',
  'subtle',
  'muted',
  'content',
  'content-secondary',
  'on-accent',
  'accent',
  'accent-soft',
  'edge',
  'edge-strong',
  'focus',
  'success',
  'danger',
  'surface-inverse',
  'inverse',
  'auth-canvas',
  'auth-surface',
  'auth-on-surface',
  'auth-on-primary',
  'auth-accent',
  'auth-accent-focus',
  'auth-content',
  'auth-content-secondary',
  'auth-edge',
  'auth-edge-strong',
] as const;

const COLOR_CLASSES = new Set(COLOR_TOKENS.map((token) => `text-${token}`));

function hasColorClass(className: string | undefined): boolean {
  if (!className) return false;
  return className.split(/\s+/).some((cls) => COLOR_CLASSES.has(cls));
}

/*
 * Does the caller's inline style already set a color?
 *
 * This matters because the two styling channels resolve in different places.
 * The ADAPTIVE screens (everything outside features/auth) style with inline
 * objects from useTheme(); the class channel resolves `--color-content` from
 * global.css, which NativeWind switches on the OS colour scheme. Emitting
 * `text-content` alongside an inline colour means two sources are fighting for
 * the same property, and which one wins is a NativeWind implementation detail —
 * exactly the class of silent bug that made the auth labels invisible (see
 * COLOR_TOKENS). If the caller stated a colour, in EITHER channel, we add none.
 */
function hasInlineColor(style: unknown): boolean {
  if (!style) return false;
  if (Array.isArray(style)) return style.some(hasInlineColor);
  return typeof style === 'object' && 'color' in style && (style as TextStyle).color != null;
}

export type AppTextProps = TextProps & {
  className?: string;
};

export function AppText({ className, style, ...rest }: AppTextProps): React.JSX.Element {
  // Default to the content colour ONLY when the caller picked none at all.
  const needsDefault = !hasColorClass(className) && !hasInlineColor(style);

  return (
    <Text className={cx(needsDefault && 'text-content', className)} style={style} {...rest} />
  );
}

export default AppText;
