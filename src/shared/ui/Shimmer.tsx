import React, { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/*
 * Shimmer — project-wide skeleton primitive (see CLAUDE.md "Skeleton loading").
 *
 * Why custom instead of a library:
 *   - Mainstream skeleton libraries (react-native-skeleton-placeholder,
 *     react-native-auto-skeleton, etc.) ship native modules that break Expo Go.
 *   - This implementation is pure JS on top of react-native-reanimated v4 +
 *     expo-linear-gradient — already installed, no new peer-deps, no native
 *     module added. Works in Expo Go and in dev builds.
 *
 * Renders a single rounded block with a left-to-right moving highlight. Compose
 * multiple <Shimmer /> blocks inside a flex layout to build a screen-shaped
 * skeleton (see src/features/auth/components/OnboardingScreenSkeleton.tsx for
 * the canonical pattern).
 *
 * Color palette: the auth subtree uses fixed-dark hex values
 *   backgroundColor  #242425 (matches --color-muted)
 *   highlightColor   #3a3a3b  (slightly lighter)
 * Callers outside the auth subtree can swap in any two colors.
 */

type Props = {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  /** Hex color for the base block. */
  backgroundColor?: string;
  /** Hex color for the moving highlight. */
  highlightColor?: string;
  /** Highlight cycle duration in ms. Default 1200. */
  speed?: number;
  /** Direction of the highlight sweep. Default 'left'. */
  direction?: 'left' | 'right';
  /** Override style for positioning. */
  style?: StyleProp<ViewStyle>;
};

export default function Shimmer({
  width = '100%',
  height = 16,
  borderRadius = 4,
  backgroundColor = '#242425',
  highlightColor = '#3a3a3b',
  speed = 1200,
  direction = 'left',
  style,
}: Props): React.JSX.Element {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: speed, easing: Easing.linear }),
      -1,
      false,
    );
  }, [progress, speed]);

  const overlayStyle = useAnimatedStyle(() => {
    const translateX = direction === 'left' ? -100 : 100;
    return {
      transform: [{ translateX: progress.value * translateX }],
      opacity: 0.9,
    };
  });

  return (
    <View
      style={[
        { width, height, borderRadius, backgroundColor, overflow: 'hidden' },
        style,
      ]}
      accessibilityRole="none"
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '60%',
          },
          overlayStyle,
        ]}
      >
        <LinearGradient
          colors={[backgroundColor, highlightColor, backgroundColor]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
