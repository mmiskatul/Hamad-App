import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

/*
 * Figma "Ellipse 1 / 3" (corner-anchored blurred ellipses, node 113:2120):
 * DARK vignettes that sit ON the dark auth canvas (#1F1F20). The Figma spec
 * uses fill #131314 (darker than canvas) with a heavy blur to darken the
 * corners. Rebuilt here as a dark radial gradient so it stays resolution-
 * independent. The peak opacity is an estimate from the Figma screenshot —
 * verify on device and tune if the vignettes read too strong / too weak.
 */
/*
 * SPLASH ONLY (Figma node 124:22). The onboarding screen used to borrow this at
 * a different size, but it now renders the real exported ellipse SVGs (with
 * their own feGaussianBlur) instead — see OnboardingBackdrop. Keeping this as a
 * radial-gradient approximation is fine for the splash, where the glows are
 * small and the exact falloff is not load-bearing.
 */
const GLOW_WIDTH = 351;
const GLOW_HEIGHT = 213;
const GLOW_COLOR = '#0a0a0b';

type Props = {
  /* Corner-anchored absolute offsets, straight from the Figma frame */
  style?: StyleProp<ViewStyle>;
};

/*
 * Each instance needs its OWN gradient id: SVG <Defs> ids are document-scoped,
 * so two CornerGlows sharing a literal "glow" id would have the second silently
 * reuse the first's stops. The splash renders two of these.
 */
let glowSeq = 0;

export default function CornerGlow({ style }: Props): React.JSX.Element {
  const gradientId = React.useMemo(() => `glow-${(glowSeq += 1)}`, []);

  return (
    <View pointerEvents="none" className="absolute" style={style}>
      <Svg width={GLOW_WIDTH} height={GLOW_HEIGHT} viewBox={`0 0 ${GLOW_WIDTH} ${GLOW_HEIGHT}`}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0%" stopColor={GLOW_COLOR} stopOpacity={0.6} />
            <Stop offset="60%" stopColor={GLOW_COLOR} stopOpacity={0.2} />
            <Stop offset="100%" stopColor={GLOW_COLOR} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={GLOW_WIDTH / 2}
          cy={GLOW_HEIGHT / 2}
          rx={GLOW_WIDTH / 2}
          ry={GLOW_HEIGHT / 2}
          fill={`url(#${gradientId})`}
        />
      </Svg>
    </View>
  );
}
