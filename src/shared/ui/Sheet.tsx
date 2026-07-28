import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Overlay from './Overlay';
import { useTheme } from '@/shared/theme';

/*
 * Bottom sheet (Figma model picker 404:1831: bg/canvas, 34pt top corners, 20pt
 * padding, 48×6 grab handle).
 *
 * Motion: slides up from the bottom edge on the Overlay's clock, and can be
 * DRAGGED down to dismiss — drag distance maps 1:1 to the sheet's offset, and on
 * release it either springs back or completes the dismissal, depending on how
 * far or how fast it was thrown. Velocity matters as much as distance: a short
 * flick should close, a slow long drag that stops early should not.
 *
 * The drag runs entirely on the UI thread; JS is only touched at the moment a
 * dismissal is committed.
 */
const HANDLE_WIDTH = 48;
const HANDLE_HEIGHT = 6;
const SHEET_RADIUS = 34;
const SHEET_PADDING = 20;
/* Past this fraction of its own height, or this velocity, a drag closes it. */
const DISMISS_FRACTION = 0.3;
const DISMISS_VELOCITY = 900;

export type SheetProps = {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  scrimLabel?: string;
  testID?: string;
};

export default function Sheet({
  visible,
  onDismiss,
  children,
  scrimLabel,
  testID,
}: SheetProps): React.JSX.Element {
  return (
    <Overlay visible={visible} onDismiss={onDismiss} scrimLabel={scrimLabel} testID={testID}>
      {({ progress }) => (
        <SheetSurface progress={progress} onDismiss={onDismiss}>
          {children}
        </SheetSurface>
      )}
    </Overlay>
  );
}

function SheetSurface({
  progress,
  onDismiss,
  children,
}: {
  progress: SharedValue<number>;
  onDismiss: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  // Measured on layout so the enter animation travels exactly the sheet's own
  // height — a guess would either overshoot (visible gap) or undershoot (jump).
  const sheetHeight = useSharedValue(screenHeight * 0.5);
  const dragY = useSharedValue(0);

  // Cancel any in-flight drag spring if we unmount mid-animation — reanimated
  // worklets otherwise keep running on a detached shared value.
  useEffect(() => () => cancelAnimation(dragY), [dragY]);

  const pan = Gesture.Pan()
    .onChange((event) => {
      // Downward only: dragging up must not detach the sheet from the edge.
      dragY.value = Math.max(0, dragY.value + event.changeY);
    })
    .onEnd((event) => {
      const past = dragY.value > sheetHeight.value * DISMISS_FRACTION;
      const flicked = event.velocityY > DISMISS_VELOCITY;
      if (past || flicked) {
        runOnJS(onDismiss)();
        return;
      }
      dragY.value = withSpring(0, { damping: 18, stiffness: 220 });
    });

  const surfaceStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          interpolate(progress.value, [0, 1], [sheetHeight.value, 0]) + dragY.value,
      },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        onLayout={(event) => {
          sheetHeight.value = event.nativeEvent.layout.height;
        }}
        style={[
          {
            position: 'absolute',
            start: 0,
            end: 0,
            bottom: 0,
            maxHeight: '90%',
            backgroundColor: theme.color.canvas,
            borderTopLeftRadius: SHEET_RADIUS,
            borderTopRightRadius: SHEET_RADIUS,
            padding: SHEET_PADDING,
            paddingBottom: SHEET_PADDING + insets.bottom,
          },
          surfaceStyle,
        ]}
        testID="sheet-surface"
      >
        {/* Grab handle (Figma 404:1833) — also the visual affordance for the drag. */}
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: HANDLE_WIDTH,
              height: HANDLE_HEIGHT,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.color.muted,
            }}
          />
        </View>

        {children}
      </Animated.View>
    </GestureDetector>
  );
}
