import React from 'react';
import { type ViewStyle } from 'react-native';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/*
 * Lifts its children clear of the software keyboard.
 *
 * REPLACES KeyboardAvoidingView, which does not work on this app's Android
 * target. Expo SDK 54 turns EDGE-TO-EDGE on by default, and an edge-to-edge
 * Android window is not resized by `adjustResize` — the keyboard is drawn OVER
 * the app instead. KeyboardAvoidingView's `height` and `padding` behaviours both
 * derive their offset from that window resize, so on Android they compute zero
 * and the focused field, the composer and anything else near the bottom simply
 * stay underneath the keyboard. That is the reported bug, and no combination of
 * `behavior` props fixes it: the measurement it depends on no longer happens.
 *
 * `useAnimatedKeyboard` reads the keyboard's real height from the platform on
 * BOTH targets and runs on the UI thread, so the lift tracks the keyboard's own
 * animation curve instead of jumping after it lands.
 *
 * The bottom SAFE-AREA INSET is subtracted because the screen has usually
 * already padded for the home indicator: when the keyboard is up it covers that
 * area, so padding for both would leave a visible gap under the keyboard.
 *
 * Children are laid out in a flex:1 column, so a ScrollView inside shrinks as
 * the keyboard rises and can scroll the focused field into view — which is what
 * stops fields ABOVE the focused one from being pushed off screen.
 *
 * TWO MECHANISMS, ONE SOURCE OF TRUTH:
 *   'padding'   (default) shrinks a flow container, so everything inside relayouts.
 *   'translate' slides the element up instead, for content that is ABSOLUTELY
 *               positioned against the bottom edge — a pinned search pill, a
 *               floating action button. Padding cannot move those: an absolute
 *               child is out of flow, so its `bottom` is measured from the parent
 *               regardless of what padding the parent has. That is exactly how the
 *               projects search pill ended up under the keyboard.
 * Both read the same keyboard height on the UI thread; only what they do with it
 * differs, which is why this is a mode rather than a second component.
 */
export type KeyboardAvoiderProps = {
  children: React.ReactNode;
  /** Extra gap between the keyboard and the content above it. */
  offset?: number;
  /** See the header — 'translate' for bottom-pinned absolute content. */
  mode?: 'padding' | 'translate';
  style?: ViewStyle;
  /** Opt out of the safe-area subtraction (content already ignores insets). */
  ignoreBottomInset?: boolean;
  testID?: string;
};

export default function KeyboardAvoider({
  children,
  offset = 0,
  mode = 'padding',
  style,
  ignoreBottomInset = false,
  testID,
}: KeyboardAvoiderProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard();

  const bottomInset = ignoreBottomInset ? 0 : insets.bottom;

  const animatedStyle = useAnimatedStyle(() => {
    // reanimated's jest mock returns a plain `{ height: 0 }`, so read through
    // `?.value` — a NaN padding would take the whole screen down with it.
    const height = keyboard.height?.value ?? 0;
    const lift = Math.max(0, height - bottomInset);
    const applied = lift > 0 ? lift + offset : 0;

    return mode === 'translate'
      ? { transform: [{ translateY: -applied }] }
      : { paddingBottom: applied };
  });

  return (
    <Animated.View
      // flex:1 is the padding mode's contract (a column that can shrink). A
      // translated element is positioned by its caller, so it must not also be
      // told to fill anything.
      style={[mode === 'padding' ? { flex: 1 } : null, style, animatedStyle]}
      testID={testID}
    >
      {children}
    </Animated.View>
  );
}
