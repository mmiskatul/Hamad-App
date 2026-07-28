import React, { useCallback, useEffect } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Add01Icon, ArrowUp02Icon, Mic02Icon } from '@hugeicons/core-free-icons';

import IconPillButton from '@/shared/ui/IconPillButton';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { Icon } from '@/shared/ui/Icon';

/*
 * Message composer (Figma "Input Container" 404:1786): bg/surface, radius 16,
 * padding 12 top / 4 bottom / 4 sides, gap 12. Row 1 is the input; row 2 is the
 * action row — add on the leading edge, mic + send on the trailing edge.
 *
 * SEND IS ABSENT UNTIL THERE IS A DRAFT (user requirement, and a departure from
 * the static frame, which shows a permanently greyed send). It then SPRINGS in —
 * scale 0.6 → 1 with a little overshoot — while its fill animates from the muted
 * tone to the action colour. Both run on the UI thread; the button is unmounted
 * while empty so it is not merely invisible to a screen reader, it is absent.
 *
 * Keyboard: the screen wraps this in a KeyboardAvoidingView, so the composer
 * rides the keyboard instead of hiding behind it. The input grows with the draft
 * up to INPUT_MAX_HEIGHT, after which it scrolls internally.
 */
const CONTAINER_RADIUS = 16;
const ACTION_SIZE = 32;
const ACTION_ICON = 16;
const INPUT_MAX_HEIGHT = 120;
const SEND_ENTER_SCALE = 0.6;
const FILL_MS = 180;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ChatComposerProps = {
  value: string;
  onChangeText: (next: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onSend?: (message: string) => void;
  onAttach?: () => void;
  onVoice?: () => void;
};

export default function ChatComposer({
  value,
  onChangeText,
  onFocus,
  onBlur,
  onSend,
  onAttach,
  onVoice,
}: ChatComposerProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();

  const trimmed = value.trim();
  const canSend = trimmed.length > 0;

  // 0 = no draft, 1 = ready to send. Drives both the entrance and the fill.
  const readiness = useSharedValue(canSend ? 1 : 0);

  useEffect(() => {
    readiness.value = canSend
      ? withSpring(1, { damping: 12, stiffness: 260 })
      : withTiming(0, { duration: FILL_MS });
  }, [canSend, readiness]);

  const sendStyle = useAnimatedStyle(() => ({
    opacity: readiness.value,
    transform: [
      { scale: SEND_ENTER_SCALE + readiness.value * (1 - SEND_ENTER_SCALE) },
    ],
  }));

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend?.(trimmed);
  }, [canSend, onSend, trimmed]);

  return (
    <View
      style={{
        backgroundColor: theme.color.surface,
        borderRadius: CONTAINER_RADIUS,
        paddingTop: theme.space.md,
        paddingBottom: theme.space.xs,
        paddingHorizontal: theme.space.xs,
        gap: theme.space.md,
      }}
    >
      <View style={{ paddingStart: theme.space.sm, paddingEnd: theme.space.xs }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={t('chat.composer.placeholder')}
          placeholderTextColor={theme.color.textSecondary}
          selectionColor={theme.color.accent}
          multiline
          submitBehavior="newline"
          style={{
            ...theme.type.body,
            color: theme.color.textPrimary,
            maxHeight: INPUT_MAX_HEIGHT,
            padding: 0, // strip Android's default inner padding
          }}
          testID="chat-composer-input"
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconPillButton
          icon={Add01Icon}
          size={ACTION_SIZE}
          iconSize={ACTION_ICON}
          accessibilityLabel={t('chat.composer.attach')}
          onPress={onAttach}
          testID="chat-attach"
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md }}>
          <IconPillButton
            icon={Mic02Icon}
            size={ACTION_SIZE}
            iconSize={ACTION_ICON}
            accessibilityLabel={t('chat.composer.voice')}
            onPress={onVoice}
            testID="chat-voice"
          />

          {canSend ? (
            <View
              style={{
                // Themed accent fill on the plain <View> so the theme flip
                // repaints (the reanimated style path skips the repaint on
                // token changes). The animated entrance / scale still lives on
                // the inner AnimatedPressable.
                backgroundColor: theme.color.accent,
                borderRadius: theme.radius.pill,
                overflow: 'hidden',
              }}
              testID="chat-send-fill"
            >
              <AnimatedPressable
                onPress={handleSend}
                accessibilityRole="button"
                accessibilityLabel={t('chat.composer.send')}
                android_ripple={{ color: theme.color.accentSoft }}
                style={[
                  {
                    width: ACTION_SIZE,
                    height: ACTION_SIZE,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  sendStyle,
                ]}
                testID="chat-send"
              >
                <Icon icon={ArrowUp02Icon} size={ACTION_ICON} color={theme.color.textOnAccent} />
              </AnimatedPressable>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
