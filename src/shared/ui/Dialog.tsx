import React from 'react';
import { View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import Overlay from './Overlay';
import { useTheme } from '@/shared/theme';

/*
 * Centred modal card (Figma upsell 404:1907: bg/canvas, 34pt radius, 20/34
 * padding).
 *
 * Motion: fades in while scaling 0.92 → 1 on the Overlay's clock. Scale rather
 * than a slide because a dialog has no edge to come from — it belongs to the
 * middle of the screen, and growing into place reads as "this is about what you
 * were just doing" instead of "a new screen arrived".
 */
const DIALOG_RADIUS = 34;
const DIALOG_MARGIN = 20;
const ENTER_SCALE = 0.92;

export type DialogProps = {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  scrimLabel?: string;
  testID?: string;
};

export default function Dialog({
  visible,
  onDismiss,
  children,
  scrimLabel,
  testID,
}: DialogProps): React.JSX.Element {
  return (
    <Overlay visible={visible} onDismiss={onDismiss} scrimLabel={scrimLabel} testID={testID}>
      {({ progress }) => (
        <DialogSurface progress={progress}>{children}</DialogSurface>
      )}
    </Overlay>
  );
}

function DialogSurface({
  progress,
  children,
}: {
  progress: SharedValue<number>;
  children: React.ReactNode;
}): React.JSX.Element {
  const theme = useTheme();

  const surfaceStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [ENTER_SCALE, 1]) }],
  }));

  return (
    // pointerEvents box-none so the scrim underneath still receives taps outside
    // the card — otherwise this full-screen centring layer would swallow them.
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: DIALOG_MARGIN }}
      pointerEvents="box-none"
    >
      <Animated.View
        style={[
          {
            width: '100%',
            backgroundColor: theme.color.canvas,
            borderRadius: DIALOG_RADIUS,
            paddingHorizontal: 20,
            paddingVertical: 34,
          },
          surfaceStyle,
        ]}
        testID="dialog-surface"
      >
        {children}
      </Animated.View>
    </View>
  );
}
