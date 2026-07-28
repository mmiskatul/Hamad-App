import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useTheme } from '@/shared/theme';
import { AppText } from './AppText';
import { Icon, type IconProps } from './Icon';
import { usePressFeedback } from './usePressFeedback';

/*
 * The adaptive app's labelled button (Figma "btn" 124:1705 / 124:2115): 52pt min
 * height, 12pt radius, 24/14 padding, optional 24pt leading glyph.
 *
 * Variants are the four the Core screens actually use — no speculative fifth:
 *   primary → action/primary fill, text/on-accent label (Save, Send)
 *   ghost   → no fill, text/secondary label (Cancel)
 *   surface → bg/surface fill, text/primary label (secondary actions)
 *   inverse → bg/surface-inverse fill, text/inverse label (Create Project,
 *             Save on Rename — the design's strongest commit button)
 *   danger  → no fill, danger label (the confirm half of a destructive dialog)
 *
 * `danger` is unfilled rather than a red slab on purpose: a solid red button is
 * the most attention-grabbing thing on a screen, which is backwards when it sits
 * next to the Cancel the user should find first.
 *
 * `pill` picks the radius: Figma uses 12pt on the form buttons and a full pill
 * on the project CTAs, which is a shape decision, not a variant.
 *
 * NOT shared with features/auth: that subtree has its own fixed-palette
 * AuthButton by design (src/features/auth/index.ts). Two buttons, deliberately,
 * because the palettes must not converge. The press dip + loading state here
 * match AuthButton's interaction model anyway, so the FEEL is the same.
 */
const BUTTON_MIN_HEIGHT = 52;

export type AppButtonVariant = 'primary' | 'ghost' | 'surface' | 'inverse' | 'danger';

export type AppButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: AppButtonVariant;
  /** Leading glyph, 24pt, tinted to match the label. */
  icon?: IconProps['icon'];
  /** Stretch to share a ROW with its siblings (Cancel / Save pairs). flex:1. */
  fill?: boolean;
  /** Fully rounded instead of the 12pt form radius. */
  pill?: boolean;
  disabled?: boolean;
  /**
   * Async submit in flight. Replaces the icon + label with a spinner, dims the
   * button, sets `accessibilityState.busy`, and blocks presses. Mirrors the
   * login / signup button's behaviour.
   */
  loading?: boolean;
  testID?: string;
};

const DISABLED_OPACITY = 0.5;

const BACKGROUND: Record<AppButtonVariant, keyof ReturnType<typeof useTheme>['color'] | null> = {
  primary: 'accent',
  surface: 'surface',
  inverse: 'surfaceInverse',
  ghost: null,
  danger: null,
};

const FOREGROUND: Record<AppButtonVariant, keyof ReturnType<typeof useTheme>['color']> = {
  primary: 'textOnAccent',
  surface: 'textPrimary',
  inverse: 'textInverse',
  ghost: 'textSecondary',
  danger: 'danger',
};

/*
 * The press dip and the spinner both need a wrapper that runs on the UI thread
 * (usePressFeedback animates a shared value). Same convention as AuthButton
 * and IconPillButton — never wrap Pressable in React.memo here, it would
 * short-circuit the reanimated re-render path.
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function AppButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  fill = false,
  pill = false,
  disabled = false,
  loading = false,
  testID,
}: AppButtonProps): React.JSX.Element {
  const theme = useTheme();
  const { animatedStyle, onPressIn, onPressOut } = usePressFeedback();

  const backgroundToken = BACKGROUND[variant];
  const background = backgroundToken ? theme.color[backgroundToken] : 'transparent';
  const foreground = theme.color[FOREGROUND[variant]];

  // A loading button is also non-interactive, and dims like a disabled one.
  const inert = disabled || loading;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={inert}
      // Belt-and-braces: Pressable's `disabled` should already block presses,
      // but a no-op onPress can still fire under heavy re-render churn on some
      // Android versions. `pointerEvents="none"` is a hard floor.
      pointerEvents={inert ? 'none' : 'auto'}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy: loading }}
      android_ripple={{ color: theme.color.accentSoft }}
      style={[
        {
          flex: fill ? 1 : undefined,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.space.sm,
          minHeight: BUTTON_MIN_HEIGHT,
          paddingHorizontal: theme.space.xl,
          paddingVertical: 14,
          borderRadius: pill ? theme.radius.pill : theme.radius.lg,
          backgroundColor: background,
          // Required or the Android ripple paints square through the radius.
          overflow: 'hidden',
          opacity: inert ? DISABLED_OPACITY : 1,
        },
        animatedStyle,
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <>
          {icon ? (
            <View style={{ width: 24, height: 24 }}>
              <Icon icon={icon} size={24} color={foreground} />
            </View>
          ) : null}
          <AppText style={{ ...theme.type.body, color: foreground }}>{label}</AppText>
        </>
      )}
    </AnimatedPressable>
  );
}
