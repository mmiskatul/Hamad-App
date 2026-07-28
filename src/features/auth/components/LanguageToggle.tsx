import React from 'react';

import { useAuthPalette, useAuthRipple } from '../palette';
import { AUTH_TYPE } from '../constants';

import SharedLanguageToggle from '@/shared/ui/LanguageToggle';

/*
 * EN | AR segmented pill for the auth screens (Figma node 113:2120).
 *
 * The control itself now lives in shared/ui — the chat drawer needs the same
 * switch, and features cannot import each other. What stays here is the only
 * auth-specific part: the palette, sourced from the resolved adaptive theme.
 *
 * THEME: the auth subtree follows the adaptive theme (see src/features/auth/index.ts).
 */
export default function LanguageToggle(): React.JSX.Element {
  const palette = useAuthPalette();
  const ripple = useAuthRipple();
  return (
    <SharedLanguageToggle
      palette={{
        border: palette.edge,
        activeBorder: palette.accentFocus,
        activeText: palette.accent,
        inactiveText: palette.onSurface,
        ripple: ripple.onDark,
      }}
      labelStyle={AUTH_TYPE.caption}
      testID="auth-language-toggle"
    />
  );
}
