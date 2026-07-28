import { useCallback, useEffect } from 'react';
import {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

/*
 * Shared tap feedback: a short scale dip while the finger is down.
 *
 * WHY this exists alongside `android_ripple`: the ripple is Android-only, so on
 * iOS a Pressable would otherwise register a tap with no acknowledgement at all.
 * This gives both platforms a consistent baseline and lets Android layer its
 * native ripple on top.
 *
 * WHY reanimated and not Pressable's `({ pressed })` style callback: that
 * callback is JS state — it re-renders the button on every touch and drops
 * frames under load. Here the scale lives in a shared value and is interpolated
 * by useAnimatedStyle, so the whole interaction runs on the UI thread and never
 * re-renders the component (mobile/CLAUDE.md: animations on the UI thread).
 *
 * Not coupled to any palette, so it is safe to use inside the fixed-palette auth
 * subtree as well as future themed features.
 */
const PRESS_SCALE = 0.97;
const PRESS_IN_MS = 90;
/* Slower on release so the button "settles" rather than snapping back. */
const PRESS_OUT_MS = 160;
const EASE = Easing.out(Easing.quad);

export type PressFeedback = {
  animatedStyle: AnimatedStyle<ViewStyle>;
  onPressIn: () => void;
  onPressOut: () => void;
};

export function usePressFeedback(scaleTo: number = PRESS_SCALE): PressFeedback {
  const scale = useSharedValue(1);

  // Cancel any in-flight timing if the component unmounts mid-press — a
  // detached shared value would otherwise keep the worklet spinning.
  useEffect(() => () => cancelAnimation(scale), [scale]);

  const onPressIn = useCallback(() => {
    scale.value = withTiming(scaleTo, { duration: PRESS_IN_MS, easing: EASE });
  }, [scale, scaleTo]);

  const onPressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: PRESS_OUT_MS, easing: EASE });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { animatedStyle, onPressIn, onPressOut };
}

export default usePressFeedback;
