import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react-native';

/*
 * Icon — the single wrapper around Hugeicons (project-wide rule, mobile/CLAUDE.md).
 *
 * Hugeicons is the ONLY icon library in this app: `@hugeicons/react-native` is
 * the renderer, `@hugeicons/core-free-icons` is the icon set, `react-native-svg`
 * is the peer. Callers import THIS component from `@/shared/ui` and pass an icon
 * from core-free-icons as the `icon` prop, so no screen has to import both
 * packages or the raw renderer.
 *
 * Size/colour are props rather than magic numbers. Across the whole app —
 * adaptive screens and the auth subtree alike — these come from useTheme() /
 * useAuthPalette() at the call site. This component stays palette-agnostic.
 */
type IconSource = React.ComponentProps<typeof HugeiconsIcon>['icon'];

export type IconProps = {
  icon: IconSource;
  size?: number;
  color?: string;
  /** Hugeicons stroke width; default 1.5 matches the set's default line weight. */
  strokeWidth?: number;
  /** For tests that assert a state-dependent glyph (e.g. a selected check). */
  testID?: string;
};

export function Icon({ icon, size = 24, color, strokeWidth = 1.5, testID }: IconProps): React.JSX.Element {
  return <HugeiconsIcon icon={icon} size={size} color={color} strokeWidth={strokeWidth} testID={testID} />;
}

export default Icon;
