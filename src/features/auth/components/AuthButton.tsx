import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useAuthPalette, useAuthRipple } from '../palette';
import { AUTH_TYPE } from '../constants';

import { AppText } from '@/shared/ui/AppText';
import { usePressFeedback } from '@/shared/ui/usePressFeedback';

/*
 * The auth pill button (Figma node 113:2120 — the Google / Apple rows and the
 * primary "Log in or sign up" row are the SAME component at two fills).
 *
 * Figma spec (pixel-exact, shared by both variants):
 *   - Radius 9999 (full pill), height 52, padding 14 / 24, gap 8, width 100%.
 *   - Label: Roboto 16 / 24, weight 400.
 *   - `surface` variant: fill = surface, label = textPrimary, optional 24x24 leading icon.
 *   - `inverse` variant: fill = textPrimary (the inverse token), label = surface, no icon.
 *
 * This replaces the former SocialAuthButton plus the primary CTA that
 * OnboardingScreen hand-rolled inline. Those had already drifted: the inline one
 * mixed `className` with a function-form `style`, which NativeWind resolves by
 * dropping the inline style, so it shipped as a square white bar. One component,
 * inline styles only, no className — that whole class of bug cannot recur here.
 *
 * INTERACTION: Android draws a native ripple clipped to the pill; both platforms
 * run a UI-thread scale dip (see usePressFeedback). `overflow: 'hidden'` is
 * required or the ripple paints as a square through the pill's rounded corners.
 *
 * THEME: the auth subtree now follows the adaptive theme (see src/features/auth/index.ts).
 * Every fill / label colour comes from `useAuthPalette()` so the button flips
 * with the user's light/dark preference, and the ripple contrast follows the
 * surface (`useAuthRipple()`).
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BUTTON_HEIGHT = 52;
const BUTTON_RADIUS = 9999;
const DISABLED_OPACITY = 0.5;

type Variant = 'surface' | 'inverse' | 'outline';

type VariantSpec = { background: string; label: string; ripple: string; border?: string };

function getVariantSpec(
  variant: Variant,
  palette: ReturnType<typeof useAuthPalette>,
  ripple: ReturnType<typeof useAuthRipple>,
): VariantSpec {
  switch (variant) {
    case 'surface':
      // Filled surface pill — onboarding's Google / Apple rows (Figma 113:2120).
      return { background: palette.surface, label: palette.onSurface, ripple: ripple.onDark };
    case 'inverse':
      // Inverse pill — primary CTA on both auth screens.
      return { background: palette.onSurface, label: palette.surface, ripple: ripple.onLight };
    case 'outline':
      // Transparent pill with a 1px edge — the login screen's social rows (135:992).
      return {
        background: 'transparent',
        label: palette.onSurface,
        ripple: ripple.onDark,
        border: palette.edgeStrong,
      };
  }
}

type Props = {
  label: string;
  /* Pass a 24x24 node; callers own its color so brand marks keep their hues. */
  icon?: React.ReactNode;
  variant?: Variant;
  onPress?: () => void;
  disabled?: boolean;
  /* Show a spinner in place of the label and block presses (e.g. async submit). */
  loading?: boolean;
  testID?: string;
};

export default function AuthButton({
  label,
  icon,
  variant = 'surface',
  onPress,
  disabled = false,
  loading = false,
  testID,
}: Props): React.JSX.Element {
  const { animatedStyle, onPressIn, onPressOut } = usePressFeedback();
  const palette = useAuthPalette();
  const ripple = useAuthRipple();
  const spec = getVariantSpec(variant, palette, ripple);
  // A loading button is also non-interactive, and dims like a disabled one.
  const inert = disabled || loading;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={inert}
      // Belt-and-braces: Pressable's `disabled` should already block presses,
      // but a no-op onPress can still fire under heavy re-render churn on
      // some Android versions. `pointerEvents="none"` is a hard floor.
      pointerEvents={inert ? 'none' : 'auto'}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy: loading }}
      android_ripple={{ color: spec.ripple }}
      style={[
        {
          width: '100%',
          height: BUTTON_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingVertical: 14,
          borderRadius: BUTTON_RADIUS,
          gap: 8,
          backgroundColor: spec.background,
          ...(spec.border ? { borderWidth: 1, borderColor: spec.border } : null),
          // Clips the Android ripple to the pill instead of its bounding box.
          overflow: 'hidden',
          opacity: inert ? DISABLED_OPACITY : 1,
        },
        animatedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spec.label} />
      ) : (
        <>
          {icon ? <View style={{ alignItems: 'center', justifyContent: 'center' }}>{icon}</View> : null}
          <AppText style={{ ...AUTH_TYPE.body, color: spec.label }}>{label}</AppText>
        </>
      )}
    </AnimatedPressable>
  );
}
