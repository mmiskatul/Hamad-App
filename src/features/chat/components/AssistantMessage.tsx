import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy01Icon, RefreshIcon, ThumbsDownIcon, ThumbsUpIcon } from '@hugeicons/core-free-icons';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import HexLogo from '@/shared/ui/HexLogo';
import { Icon, type IconProps } from '@/shared/ui/Icon';
import TypewriterText from '@/shared/ui/TypewriterText';

/*
 * The assistant's reply (Figma 146:1679 + 182:678): the 16pt brand mark on the
 * start edge, then a 297-wide column with the answer, its timestamp, and a row
 * of 16pt actions at gap 24 — like, dislike, copy, regenerate.
 *
 * THE MARK IS RENDERED FROM HexLogo WITHOUT ITS RING (`ring={false}`), which is
 * what the frame shows: at 16pt the hex ring collapses into a smudge, so the
 * design uses the bare mark. Static here — the spinning one is the THINKING
 * state, and a reply that keeps spinning after it has arrived says the opposite
 * of what it means.
 *
 * FEEDBACK IS LOCAL AND EXCLUSIVE: thumbs up and down are one choice, not two
 * toggles, and tapping the active one clears it. Nothing is sent anywhere yet.
 *
 * TODO(backend): feedback needs a rating endpoint, and regenerate must re-run
 * the prompt through backend/src/ai/routing.service.ts.
 */
const MARK_SCALE = 16 / 55; // Figma draws the 55pt mark at 16pt here.
const ACTION_GLYPH = 16;
const ACTION_GAP = 24;

export type AssistantMessageProps = {
  text: string;
  /** Pre-formatted time ("9:48 PM"). */
  time: string;
  /** Reveal word by word — true only for the reply that just arrived. */
  animate?: boolean;
  onRevealed?: () => void;
  onRegenerate?: () => void;
  testID?: string;
};

type Feedback = 'none' | 'up' | 'down';

function AssistantMessage({
  text,
  time,
  animate = false,
  onRevealed,
  onRegenerate,
  testID,
}: AssistantMessageProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();

  const [feedback, setFeedback] = useState<Feedback>('none');
  const [copied, setCopied] = useState(false);

  const onCopy = useCallback(() => {
    Clipboard.setStringAsync(text).catch(() => {
      /* Clipboard can refuse on a locked device — silently not copying beats
         crashing the transcript. The label simply does not flip to "Copied". */
    });
    setCopied(true);
  }, [text]);

  const vote = useCallback(
    (next: Exclude<Feedback, 'none'>) => setFeedback(current => (current === next ? 'none' : next)),
    [],
  );

  return (
    <View style={{ flexDirection: 'row', gap: theme.space.lg }} testID={testID}>
      <View style={{ paddingTop: 3 }}>
        <HexLogo scale={MARK_SCALE} ring={false} />
      </View>

      <View style={{ flex: 1, gap: theme.space.lg }}>
        <View style={{ gap: theme.space.sm }}>
          <TypewriterText
            text={text}
            animate={animate}
            onDone={onRevealed}
            style={{ ...theme.type.body, color: theme.color.textPrimary }}
            testID={testID ? `${testID}-text` : undefined}
          />
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

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: ACTION_GAP }}>
          <Action
            icon={ThumbsUpIcon}
            label={t('chat.conversation.like')}
            active={feedback === 'up'}
            onPress={() => vote('up')}
            testID={testID ? `${testID}-like` : undefined}
          />
          <Action
            icon={ThumbsDownIcon}
            label={t('chat.conversation.dislike')}
            active={feedback === 'down'}
            onPress={() => vote('down')}
            testID={testID ? `${testID}-dislike` : undefined}
          />
          <Action
            icon={Copy01Icon}
            label={t(copied ? 'chat.conversation.copied' : 'chat.conversation.copy')}
            active={copied}
            onPress={onCopy}
            testID={testID ? `${testID}-copy` : undefined}
          />
          <Action
            icon={RefreshIcon}
            label={t('chat.conversation.regenerate')}
            onPress={onRegenerate}
            testID={testID ? `${testID}-regenerate` : undefined}
          />
        </View>
      </View>
    </View>
  );
}

/*
 * NOT memoised: the icon action row and the message body read `theme.color.*`
 * inline, and `React.memo` can short-circuit the re-render that re-evaluates
 * those styles on Fabric — the user's reported bug had themed fills on
 * memo'd chat components stuck on the previous palette. The transcript
 * re-renders on every keystroke and store update anyway, so the saving was
 * small and the trade was wrong.
 */
export default AssistantMessage;

function Action({
  icon,
  label,
  active = false,
  onPress,
  testID,
}: {
  icon: IconProps['icon'];
  label: string;
  active?: boolean;
  onPress?: () => void;
  testID?: string;
}): React.JSX.Element {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      // The glyphs are 16pt with no fill, so the touch target has to come from
      // hitSlop or half of these would be unhittable.
      hitSlop={12}
      testID={testID}
    >
      <Icon icon={icon} size={ACTION_GLYPH} color={active ? theme.color.accent : theme.color.textSecondary} />
    </Pressable>
  );
}
