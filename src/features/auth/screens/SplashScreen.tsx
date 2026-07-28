import React from 'react';
import { View } from 'react-native';
import { useAuthPalette } from '../palette';
import CornerGlow from '../components/CornerGlow';
import HexLogo from '@/shared/ui/HexLogo';

/*
 * Figma node 124:22 "Splash animation" (402×874 frame).
 * Glow offsets are corner-anchored px from the Figma frame:
 *   top-left glow    → node 124:26 at (-255, -101)
 *   bottom-right glow → node 124:40 at (right -84, bottom -129)
 * Logo vertical anchor: top 44.51% of the frame.
 *
 * THEME: the auth subtree follows the adaptive theme (see src/features/auth/index.ts).
 * The canvas tracks the resolved palette, so the splash lands on the correct
 * background in both light and dark mode without a flash on the handoff.
 */
export default function SplashScreen(): React.JSX.Element {
  const palette = useAuthPalette();
  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <CornerGlow style={{ top: -101, left: -255 }} />
      <CornerGlow style={{ bottom: -129, right: -84 }} />
      <View style={{ position: 'absolute', start: 0, end: 0, alignItems: 'center', top: '44.51%' }}>
        <HexLogo motion="brand" />
      </View>
    </View>
  );
}
