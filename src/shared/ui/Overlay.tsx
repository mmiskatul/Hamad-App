import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';

/*
 * Overlay — the shared plumbing behind every dismissible surface in the app
 * (drawer, bottom sheet, dialog, popover). It owns the four things each of
 * them would otherwise re-implement and get subtly wrong:
 *
 *   1. MOUNT LIFETIME. `visible` flips to false immediately, but the child still
 *      has to animate out. This keeps the overlay mounted until the exit
 *      animation actually finishes — unmounting is driven by the animation's own
 *      completion callback, not a JS timer that can drift from it.
 *   2. THE SCRIM. Tapping it dismisses — that is the "tap outside to close"
 *      behaviour the drawer needs, and what every other surface should do too.
 *      It fades on the SAME clock as the content moves, so they cannot drift.
 *   3. THE BLUR. The screen behind a presented surface is out of scope, and a
 *      translucent tint alone does not say so — the live composer and chrome
 *      stayed legible right next to the drawer. Blurring the backdrop is what
 *      makes the surface read as the only thing you can act on.
 *   4. ANDROID HARDWARE BACK, wired to the same dismiss path. A surface you can
 *      open but not Back out of is a trap.
 *
 * WHY NOT <Modal>: a native Modal is its own window, and a blur view can only
 * sample the window it lives in — inside a Modal on Android the backdrop blur
 * has nothing to sample and degrades to a flat grey sheet. Rendering inline (an
 * absolutely-positioned sibling that covers its screen) is what lets the blur
 * actually see the app underneath. Screens must therefore render their overlays
 * as the LAST child of a flex:1 root; `zIndex` keeps them above earlier
 * siblings on both platforms.
 *
 * Children receive `progress`, a 0→1 shared value they drive their own
 * transform from (slide, scale, whatever the surface calls for).
 */
const ENTER_MS = 260;
const EXIT_MS = 200;
/* Decelerate in, accelerate out — the standard motion asymmetry. */
const ENTER_EASING = Easing.out(Easing.cubic);
const EXIT_EASING = Easing.in(Easing.cubic);
/* Enough to make text behind unreadable without turning the backdrop to mud. */
const BLUR_INTENSITY = 32;
/* Above every in-screen sibling; overlays are the top layer of their screen. */
const OVERLAY_Z = 100;

export type OverlayRenderProps = {
  /** 0 = fully dismissed, 1 = fully presented. */
  progress: SharedValue<number>;
  /** Run the exit animation, then unmount. */
  close: () => void;
};

export type OverlayProps = {
  visible: boolean;
  onDismiss: () => void;
  children: (props: OverlayRenderProps) => React.ReactNode;
  /** Set false for surfaces that must not be dismissed by tapping the scrim. */
  dismissOnScrimPress?: boolean;
  /** Accessibility label for the scrim's implicit "close" action. */
  scrimLabel?: string;
  testID?: string;
};

export default function Overlay({
  visible,
  onDismiss,
  children,
  dismissOnScrimPress = true,
  scrimLabel,
  testID,
}: OverlayProps): React.JSX.Element | null {
  const theme = useTheme();
  const { t } = useTranslation();
  const progress = useSharedValue(0);
  // Keeps the overlay mounted through the exit animation.
  const [mounted, setMounted] = useState(visible);

  const unmount = useCallback(() => setMounted(false), []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withTiming(1, {
        duration: ENTER_MS,
        easing: ENTER_EASING,
        reduceMotion: ReduceMotion.System,
      });
      return;
    }

    progress.value = withTiming(
      0,
      { duration: EXIT_MS, easing: EXIT_EASING, reduceMotion: ReduceMotion.System },
      (finished) => {
        'worklet';
        if (finished) runOnJS(unmount)();
      },
    );
  }, [visible, progress, unmount]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onDismiss();
      return true;
    });
    return () => sub.remove();
  }, [visible, onDismiss]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  if (!mounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: OVERLAY_Z }]} testID={testID}>
      <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
        <BlurView
          intensity={BLUR_INTENSITY}
          tint={theme.mode === 'dark' ? 'dark' : 'light'}
          // Android has no system backdrop blur; this is the library's own
          // implementation and the only value that actually blurs there.
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.color.overlayBlur }]}
          onPress={dismissOnScrimPress ? onDismiss : undefined}
          accessibilityRole="button"
          accessibilityLabel={scrimLabel ?? t('common.cancel')}
          testID="overlay-scrim"
        />
      </Animated.View>

      {children({ progress, close: onDismiss })}
    </View>
  );
}
