import React from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/shared/theme';
import { Icon, type IconProps } from './Icon';
import { usePressFeedback } from './usePressFeedback';

/*
 * Round icon button — Figma's "btn" component, which recurs across the whole
 * app at three sizes:
 *   header   → 52pt hit area, 24pt glyph, bg/muted fill (menu, back)
 *   top bar  → 40pt hit area, 24pt glyph, no fill (compose, appearance)
 *   composer → 32pt hit area, 16pt glyph, no fill except send
 *
 * One component with a `size` and an optional `filled` covers all of them, so no
 * screen repeats the Pressable markup.
 *
 * Lives in shared/ui rather than features/chat (where it started) because the
 * settings screens use the same 52pt filled pill for their back affordance, and
 * features may not import each other.
 *
 * Colors come from useTheme() — ADAPTIVE part of the app, light and dark.
 *
 * THEMED-FILL ARCHITECTURE: the round fill is painted by an OUTER `<View>`
 * whose `backgroundColor` comes from `theme.color.muted`. The inner
 * `AnimatedPressable` carries the size, ripple and animated press scale, and
 * stays transparent. Why two layers: reanimated's
 * `createAnimatedComponent(Pressable)` takes over the style prop the moment a
 * style array contains an animated value, and on Android that prevents the
 * `backgroundColor` from repainting when only the theme token changes (the
 * reported bug). Splitting the styled fill onto a plain `<View>` keeps the
 * themed colour on the normal RN style path — the user's palette toggle
 * repaints it just like the model pill in `ChatHeader` does — while the
 * press-scale animation stays on reanimated.
 */
export type IconPillButtonProps = {
  icon: IconProps['icon'];
  accessibilityLabel: string;
  onPress?: () => void;
  /** Diameter of the touch target. Figma: 52 in the top bar, 32 in the composer. */
  size?: number;
  /** Glyph size. Figma: 24 with size 52, 16 with size 32. */
  iconSize?: number;
  /** Paint the bg/muted fill behind the glyph. */
  filled?: boolean;
  /** Tint the glyph; defaults to text/primary. */
  color?: string;
  disabled?: boolean;
  testID?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DISABLED_OPACITY = 0.5;

export default function IconPillButton({
  icon,
  accessibilityLabel,
  onPress,
  size = 32,
  iconSize = 16,
  filled = false,
  color,
  disabled = false,
  testID,
}: IconPillButtonProps): React.JSX.Element {
  const theme = useTheme();
  const { animatedStyle, onPressIn, onPressOut } = usePressFeedback();

  return (
    <View
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={{
        width: size,
        height: size,
        borderRadius: theme.radius.pill,
        // Themed fill lives here, NOT on the AnimatedPressable — see the
        // header note on the themed-fill architecture.
        backgroundColor: filled ? theme.color.muted : 'transparent',
        // Required or the Android ripple paints square through the circle.
        overflow: 'hidden',
        opacity: disabled ? DISABLED_OPACITY : 1,
      }}
    >
      <AnimatedPressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        android_ripple={{ color: theme.color.accentSoft, borderless: !filled, radius: size / 2 }}
        style={[
          {
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
          },
          animatedStyle,
        ]}
      >
        <Icon icon={icon} size={iconSize} color={color ?? theme.color.textPrimary} />
      </AnimatedPressable>
    </View>
  );
}
