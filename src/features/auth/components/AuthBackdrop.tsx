import React from 'react';
import { View } from 'react-native';

import TopLeftPattern from '../../../../assets/auth/top-left-pattern.svg';

/*
 * Shared backdrop for the plain auth screens — login, password, verify-email
 * (Figma 135:992 / 135:1990 / 135:1062, all the same). Just the ornamental
 * pattern on the #1F1F20 canvas, nothing else.
 *
 * (Onboarding has its own richer backdrop with the city skyline; this one is the
 * quiet, pattern-only variant every other auth screen shares.)
 *
 * History: this once carried a dark top vignette (removed — it read as a visible
 * ring) and a faint warm bottom glow (removed on request). The pattern's own
 * #3F332B fill is subtle enough to stand alone, so no radial layers remain.
 *
 * THEME CONTRACT: fixed-palette auth subtree (src/features/auth/index.ts).
 */
export default function AuthBackdrop(): React.JSX.Element {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
      <TopLeftPattern
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
    </View>
  );
}
