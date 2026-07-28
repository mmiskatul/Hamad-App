import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import HexRing from '../../../assets/brand/hex-ring.svg';
import LogoMark from '../../../assets/brand/logo-mark.svg';

/*
 * Figma node 338:805 ("Container"): 111×131.26 hex ring with the 55×61 logo
 * mark centered inside. The ring never moves; only the MARK rotates.
 *
 * PROMOTED from features/auth to shared/ui (and its assets from assets/auth to
 * assets/brand) when the chat home screen needed the same mark: it is the brand
 * logo, not an auth component, and a feature may not import another feature's
 * internals. It is palette-independent — the SVGs carry their own colours — so
 * it is safe in both the fixed-palette auth subtree and adaptive screens.
 *
 * TWO MOTIONS, and they mean different things:
 *
 *   'brand'    the splash / welcome signature. 180° → 0° ease-out over 1s, rest
 *              1s at 0°, loop — the exact Figma keyframe track (motion 356:813).
 *              It is a flourish that settles: the mark keeps arriving at rest.
 *
 *   'thinking' the assistant is composing a reply. Figma motion 144:1495:
 *              `rotate` 6.283rad -> 0rad over 2s, linear, infinite — i.e. a full
 *              turn ANTI-CLOCKWISE, with no rest. Deliberately the opposite
 *              direction and a different curve from 'brand', because the two can
 *              appear on the same screen seconds apart and a spinner that eases
 *              to a stop reads as "finished"; the whole point of this one is
 *              that it has not finished.
 *
 * `reduceMotion: Never` on 'brand' is deliberate (it is the brand moment, and
 * emulators often have the OS flag set unknowingly). 'thinking' respects the
 * system setting: it is a status indicator, not branding, and a user who asked
 * for less motion should get a still mark plus the text status beside it.
 */
const RING_WIDTH = 111;
const RING_HEIGHT = 131.26;
const MARK_WIDTH = 55;
const MARK_HEIGHT = 61;
const SPIN_MS = 1000;
const REST_MS = 1000;
/* CSS `ease-out`, as specified by the Figma keyframe track */
const EASE_OUT = Easing.bezier(0, 0, 0.58, 1);
/* One full anti-clockwise turn — Figma's 2s linear track (motion 144:1495). */
const THINKING_MS = 2000;

export type HexLogoMotion = 'none' | 'brand' | 'thinking';

type Props = {
  motion?: HexLogoMotion;
  scale?: number;
  /** Draw the hex ring behind the mark. The thinking indicator is mark-only. */
  ring?: boolean;
};

export default function HexLogo({
  motion = 'none',
  scale = 1,
  ring = true,
}: Props): React.JSX.Element {
  const rotation = useSharedValue(motion === 'brand' ? 180 : 0);

  useEffect(() => {
    if (motion === 'none') {
      cancelAnimation(rotation);
      rotation.value = 0;
      return;
    }

    if (motion === 'brand') {
      rotation.value = 180;
      rotation.value = withRepeat(
        withSequence(
          withTiming(0, { duration: SPIN_MS, easing: EASE_OUT, reduceMotion: ReduceMotion.Never }),
          withDelay(REST_MS, withTiming(180, { duration: 0, reduceMotion: ReduceMotion.Never })),
        ),
        -1,
      );
      return;
    }

    // 'thinking' — 360° -> 0° is Figma's own direction of travel (a decreasing
    // angle reads anti-clockwise). Set to 360 first so a switch from 'brand'
    // cannot start the turn part-way round.
    rotation.value = 360;
    rotation.value = withRepeat(
      withTiming(0, { duration: THINKING_MS, easing: Easing.linear }),
      -1,
    );
  }, [motion, rotation]);

  // Stop the loop when the indicator unmounts — an orphaned infinite animation
  // keeps the UI thread busy for the life of the app.
  useEffect(() => () => cancelAnimation(rotation), [rotation]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const width = ring ? RING_WIDTH * scale : MARK_WIDTH * scale;
  const height = ring ? RING_HEIGHT * scale : MARK_HEIGHT * scale;

  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      {ring ? <HexRing width={RING_WIDTH * scale} height={RING_HEIGHT * scale} /> : null}
      <Animated.View style={[ring ? { position: 'absolute' } : null, markStyle]}>
        <LogoMark width={MARK_WIDTH * scale} height={MARK_HEIGHT * scale} />
      </Animated.View>
    </View>
  );
}
