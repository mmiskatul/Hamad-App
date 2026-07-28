import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/shared/theme';

/*
 * Binary switch (Figma 185:3520, the "Enable memory" row).
 *
 * Figma geometry, taken from the node rather than the platform default: 44pt
 * track, 4pt horizontal / 3pt vertical padding, 20×12 thumb at radius 6 — a
 * noticeably flatter control than RN's `<Switch>`, which is why this is drawn
 * rather than themed. `<Switch>` also cannot be tinted consistently across iOS
 * and Android without per-platform props, and its size is fixed.
 *
 * OFF is the only state the design gives (track bg/canvas, thumb
 * bg/surface-inverse). ON is decided here: the track takes the brand accent and
 * the thumb keeps its fill, because the accent is what "active" means everywhere
 * else in this app (the billing segment, the filter chips, the focus ring).
 *
 * The animation runs on the UI thread — a shared value derived from the `value`
 * prop, not React state — so a parent re-render is not what moves the thumb.
 * RTL: travel is a transform, and `I18nManager` already mirrors the parent row,
 * so the thumb starts on the writing direction's leading edge without a flip
 * here.
 */
const TRACK_WIDTH = 44;
const PAD_X = 4;
const PAD_Y = 3;
const THUMB_WIDTH = 20;
const THUMB_HEIGHT = 12;
const TRACK_HEIGHT = THUMB_HEIGHT + PAD_Y * 2;
const TRAVEL = TRACK_WIDTH - PAD_X * 2 - THUMB_WIDTH;
const DURATION_MS = 160;

export type ToggleProps = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  /** Announced by the screen reader — the row's label, not "on"/"off". */
  accessibilityLabel: string;
  disabled?: boolean;
  testID?: string;
};

export default function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
  testID,
}: ToggleProps): React.JSX.Element {
  const theme = useTheme();

  // 0 = off, 1 = on. Derived from the prop so the control cannot drift out of
  // sync with the store that owns the value.
  const progress = useDerivedValue(() => withTiming(value ? 1 : 0, { duration: DURATION_MS }));

  const offTrack = theme.color.canvas;
  const onTrack = theme.color.accent;

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [offTrack, onTrack]),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
  }));

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      hitSlop={8}
      testID={testID}
    >
      <Animated.View
        style={[
          {
            width: TRACK_WIDTH,
            height: TRACK_HEIGHT,
            paddingHorizontal: PAD_X,
            paddingVertical: PAD_Y,
            borderRadius: theme.radius.pill,
            opacity: disabled ? 0.4 : 1,
          },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: THUMB_WIDTH,
              height: THUMB_HEIGHT,
              borderRadius: THUMB_HEIGHT / 2,
              backgroundColor: value ? theme.color.textOnAccent : theme.color.surfaceInverse,
            },
            thumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}
