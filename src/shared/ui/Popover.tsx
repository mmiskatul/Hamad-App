import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, View, useWindowDimensions, type KeyboardEvent } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/theme';
import Overlay from './Overlay';

/*
 * Module-level continuous native keyboard tracking.
 *
 * `Keyboard.metrics()` gives the synchronous native frame at any instant, but
 * under some Android edge-to-edge shells it can return undefined. The module-level
 * tracker subscribes once globally so the latest non-zero keyboard height is ALWAYS
 * available synchronously on frame 1 when PopoverCard mounts, avoiding any single-frame
 * stale state layout drift.
 */
let globalLastKeyboardHeight = 0;

if (typeof window !== 'undefined' || Platform.OS !== 'web') {
  const onGlobalKbShow = (e: KeyboardEvent) => {
    const h = e.endCoordinates?.height ?? 0;
    if (h > 0) {
      globalLastKeyboardHeight = h;
    }
  };

  const onGlobalKbHide = () => {
    globalLastKeyboardHeight = 0;
  };

  Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', onGlobalKbShow);
  Keyboard.addListener('keyboardDidChangeFrame', onGlobalKbShow);
  Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', onGlobalKbHide);
}

/*
 * Anchored menu card — the surface behind every small floating menu (the
 * composer's attachment menu, the chat and project row menus).
 *
 * WHY IT GROWS FROM A CORNER: a menu that fades in centred reads as "a new
 * thing arrived"; one that grows out of the control you pressed reads as
 * "that button opened". React Native has no `transform-origin`, so the effect
 * is a translate pair applied alongside the scale — shift by half the shrinkage
 * in each axis, signed by which corner is meant to stay put.
 *
 * KEYBOARD AVOIDANCE: Bottom-anchored popovers (e.g. the composer's + button
 * attachment menu) track real-time keyboard height dynamically in both directions
 * (opening and collapsing) so the modal always stays visible right above the + icon
 * on top of the keyboard when open, and slides down smoothly with the keyboard when collapsed.
 */
const MENU_RADIUS = 24;
const ENTER_SCALE = 0.85;

/** Which corner stays put while the card grows. */
export type PopoverOrigin = 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';

export type PopoverAnchor = {
  /** Offset from the start edge. Give exactly one of start / end. */
  start?: number;
  end?: number;
  /** Offset from the top edge. Give exactly one of top / bottom. */
  top?: number;
  bottom?: number;
};

export type PopoverProps = {
  visible: boolean;
  onDismiss: () => void;
  anchor: PopoverAnchor;
  origin: PopoverOrigin;
  width: number;
  /** Figma varies this per menu: 24 for the row menus, 20 for the composer's. */
  radius?: number;
  /** Card fill. Defaults to bg/surface; the model sheet passes bg/canvas so its
   * rows (bg/surface) can lift off it (Figma 404:1831). */
  background?: string;
  children: React.ReactNode;
  scrimLabel?: string;
  testID?: string;
};

export default function Popover({
  visible,
  onDismiss,
  anchor,
  origin,
  width,
  radius = MENU_RADIUS,
  background,
  children,
  scrimLabel,
  testID,
}: PopoverProps): React.JSX.Element {
  return (
    <Overlay visible={visible} onDismiss={onDismiss} scrimLabel={scrimLabel}>
      {({ progress }) => (
        <PopoverCard
          progress={progress}
          anchor={anchor}
          origin={origin}
          width={width}
          radius={radius}
          background={background}
          testID={testID}
        >
          {children}
        </PopoverCard>
      )}
    </Overlay>
  );
}

function PopoverCard({
  progress,
  anchor,
  origin,
  width,
  radius,
  background,
  children,
  testID,
}: {
  progress: SharedValue<number>;
  anchor: PopoverAnchor;
  origin: PopoverOrigin;
  width: number;
  radius: number;
  background?: string;
  children: React.ReactNode;
  testID?: string;
}): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard();
  const { height: windowHeight } = useWindowDimensions();

  // Instant frame-1 native height evaluation
  const getInitialKbHeight = () => {
    const metrics = Keyboard.metrics?.();
    if (metrics && metrics.height > 0) return metrics.height;
    if (metrics && metrics.screenY && metrics.screenY < windowHeight) {
      return Math.max(0, windowHeight - metrics.screenY);
    }
    return globalLastKeyboardHeight;
  };

  const [nativeKHeight, setNativeKHeight] = useState(getInitialKbHeight());

  useEffect(() => {
    const onShow = (e: KeyboardEvent) => {
      const h = e.endCoordinates?.height ?? 0;
      const y = e.endCoordinates?.screenY;
      let calculated = h;
      if (y && y < windowHeight) {
        calculated = Math.max(h, windowHeight - y);
      }
      if (calculated > 0) {
        globalLastKeyboardHeight = calculated;
        setNativeKHeight(calculated);
      }
    };

    const onHide = () => {
      globalLastKeyboardHeight = 0;
      setNativeKHeight(0);
    };

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow,
    );
    const frameSub = Keyboard.addListener('keyboardDidChangeFrame', onShow);
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide,
    );

    return () => {
      showSub.remove();
      frameSub.remove();
      hideSub.remove();
    };
  }, [windowHeight]);

  // Measured, not assumed — see the header.
  const cardWidth = useSharedValue(width);
  const cardHeight = useSharedValue(0);

  const growsFromTop = origin.startsWith('top');
  const growsFromStart = origin.endsWith('start');

  const cardStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 1], [ENTER_SCALE, 1]);
    const shrinkX = (1 - scale) * cardWidth.value;
    const shrinkY = (1 - scale) * cardHeight.value;

    const animKHeight = keyboard.height?.value ?? 0;
    const activeKHeight = animKHeight > 0 ? animKHeight : nativeKHeight;

    const lift = Math.max(0, activeKHeight > 0 ? activeKHeight - insets.bottom : 0);
    const translateYKeyboard = anchor.bottom !== undefined ? -lift : 0;

    return {
      opacity: progress.value,
      transform: [
        // Half the shrinkage, pushed toward the corner that must stay put.
        { translateX: (growsFromStart ? -shrinkX : shrinkX) / 2 },
        { translateY: (growsFromTop ? -shrinkY : shrinkY) / 2 + translateYKeyboard },
        { scale },
      ],
    };
  });

  return (
    <Animated.View
      onLayout={(event) => {
        cardWidth.value = event.nativeEvent.layout.width;
        cardHeight.value = event.nativeEvent.layout.height;
      }}
      style={[
        {
          position: 'absolute',
          start: anchor.start,
          end: anchor.end,
          top: anchor.top,
          bottom: anchor.bottom,
          width,
          backgroundColor: background ?? theme.color.surface,
          borderRadius: radius,
          overflow: 'hidden',
        },
        cardStyle,
      ]}
      testID={testID}
    >
      <View>{children}</View>
    </Animated.View>
  );
}
