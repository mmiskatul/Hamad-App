import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import HexLogo from '@/shared/ui/HexLogo';

/*
 * "The assistant is composing a reply" (Figma 144:1314): the 16pt brand mark
 * turning anti-clockwise beside a small-caps THINKING label.
 *
 * Both halves come straight from the Figma motion track (144:1495 / 144:1550),
 * which is ONE 2s loop covering the pair:
 *   mark  — rotate 360° → 0°, linear, infinite. Lives in HexLogo's 'thinking'
 *           motion, since the mark is shared with the splash and the hero.
 *   label — opacity 0.04 → 1 over the first 25% on a springy
 *           cubic-bezier(0.45, 1.45, 0.8, 1), then holds at 1 for the rest.
 *
 * The label pulses on the SAME clock as the rotation rather than fading on its
 * own timer, which is why the durations are shares of one constant here: two
 * independent loops drift apart within a few seconds and the pair starts to
 * look broken.
 */
const CYCLE_MS = 2000;
/* The label reaches full strength a quarter of the way through the cycle. */
const FADE_MS = CYCLE_MS * 0.25;
const MIN_OPACITY = 0.04;
/* Figma's cubic-bezier(0.45, 1.45, 0.8, 1) — overshoots, so it "pops" in. */
const FADE_EASING = Easing.bezier(0.45, 1.45, 0.8, 1);
const MARK_SCALE = 16 / 55;

export default function ThinkingIndicator(): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();

  const opacity = useSharedValue(MIN_OPACITY);

  useEffect(() => {
    opacity.value = MIN_OPACITY;
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: FADE_MS, easing: FADE_EASING }),
        // Hold for the remainder of the cycle so the pair stays in phase.
        withTiming(1, { duration: CYCLE_MS - FADE_MS }),
        withTiming(MIN_OPACITY, { duration: 0 }),
      ),
      -1,
    );

    return () => cancelAnimation(opacity);
  }, [opacity]);

  const labelStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.lg }}
      accessibilityRole="progressbar"
      accessibilityLabel={t('chat.conversation.thinking')}
      testID="chat-thinking"
    >
      <HexLogo motion="thinking" scale={MARK_SCALE} ring={false} />

      <Animated.View style={labelStyle}>
        <AppText
          style={{
            ...theme.type.tag,
            color: theme.color.textSecondary,
            textTransform: 'uppercase',
          }}
        >
          {t('chat.conversation.thinking')}
        </AppText>
      </Animated.View>
    </View>
  );
}
