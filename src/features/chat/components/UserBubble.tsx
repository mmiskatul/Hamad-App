import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { AppText } from '@/shared/ui/AppText';

/*
 * The user's own message (Figma 146:1716): a bg/surface card on the END edge,
 * 19/16 padding, gap 12, with the send time underneath as a small-caps Label.
 *
 * CORNER SHAPE CARRIES THE SPEAKER. Figma rounds three corners at radius/lg and
 * leaves the TOP-END one square, so the bubble points back at the edge it came
 * from — which is why it uses `borderTopStartRadius` / `borderTopEndRadius`
 * rather than left/right: under Arabic the bubble moves to the other edge and
 * the square corner has to move with it, or it points at nothing.
 *
 * Width is capped as a FRACTION of the column rather than Figma's literal 186pt:
 * that frame is one example string on a 402pt canvas, and a fixed width would
 * wrap "ok" onto three lines and clip a long paragraph.
 */
const MAX_WIDTH_FRACTION = 0.78;

export type UserBubbleProps = {
  text: string;
  /** Pre-formatted send time ("9:48 PM") — locale-aware at the caller. */
  time: string;
  testID?: string;
};

export default function UserBubble({ text, time, testID }: UserBubbleProps): React.JSX.Element {
  const theme = useTheme();

  return (
    <View style={{ width: '100%', alignItems: 'flex-end' }}>
      <View
        style={{
          maxWidth: `${MAX_WIDTH_FRACTION * 100}%`,
          gap: theme.space.md,
          paddingHorizontal: 19,
          paddingVertical: theme.space.lg,
          backgroundColor: theme.color.surface,
          borderTopStartRadius: theme.radius.lg,
          borderBottomStartRadius: theme.radius.lg,
          borderBottomEndRadius: theme.radius.lg,
          // Square on the edge the message came from.
          borderTopEndRadius: 0,
        }}
        testID={testID}
      >
        <AppText style={{ ...theme.type.body, color: theme.color.textPrimary }}>{text}</AppText>
        <AppText
          style={{
            ...theme.type.tag,
            color: theme.color.textSecondary,
            textTransform: 'uppercase',
          }}
        >
          {time}
        </AppText>
      </View>
    </View>
  );
}
