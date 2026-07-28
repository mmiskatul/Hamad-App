import React from 'react';
import { Pressable, View } from 'react-native';
import { Cancel01Icon, PinIcon } from '@hugeicons/core-free-icons';

import { useTheme } from '@/shared/theme';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';

/*
 * Recent Chat History row (Figma 182:723 / Chat history SVG).
 *
 * One conversation is one surface card: rounded rect, no divider, the delete
 * icon sits flush in the top-right corner. Figma dims every row but the OPEN
 * one — same idea as MetaListRow.dimmed, just on a card.
 *
 * Kept here (chat-local) rather than in shared/ui because nothing else wants
 * the surface-card layout — MetaListRow covers the hairline-divided list
 * pattern, this one is the standalone card pattern.
 */
const CARD_HEIGHT = 67;
const DOT_SIZE = 3;

export type ChatHistoryRowProps = {
  title: string;
  /** Pre-formatted "9:48 PM" and "DEC 7, 2026" halves. */
  time: string;
  date: string;
  /** Dim the title — history uses it for every chat but the open one. */
  dimmed?: boolean;
  pinned?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
  testID?: string;
};

export default function ChatHistoryRow({
  title,
  time,
  date,
  dimmed = false,
  pinned = false,
  onPress,
  onLongPress,
  onDelete,
  testID,
}: ChatHistoryRowProps): React.JSX.Element {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${time} ${date}`}
      android_ripple={{ color: theme.color.accentSoft }}
      style={{
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.md,
        paddingHorizontal: theme.space.lg,
        minHeight: CARD_HEIGHT,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.color.surface,
      }}
      testID={testID}
    >
      {/*
        Small dot — Figma renders a 1.5px circle at the start of every row.
        Pin takes the same slot so the row doesn't shift between states.
      */}
      {pinned ? (
        <Icon
          icon={PinIcon}
          size={12}
          color={dimmed ? theme.color.textSecondary : theme.color.textPrimary}
        />
      ) : (
        <View
          style={{
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: DOT_SIZE / 2,
            backgroundColor: dimmed ? theme.color.textSecondary : theme.color.textPrimary,
          }}
        />
      )}

      <View style={{ flex: 1, gap: 2 }}>
        <AppText
          numberOfLines={1}
          style={{
            ...theme.type.body,
            color: dimmed ? theme.color.textSecondary : theme.color.textPrimary,
          }}
        >
          {title}
        </AppText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppText
            style={{
              ...theme.type.tag,
              color: theme.color.textSecondary,
              textTransform: 'uppercase',
            }}
          >
            {time}
          </AppText>
          <View
            style={{
              width: 3,
              height: 3,
              borderRadius: 1.5,
              backgroundColor: theme.color.textSecondary,
            }}
          />
          <AppText
            style={{
              ...theme.type.tag,
              color: theme.color.textSecondary,
              textTransform: 'uppercase',
            }}
          >
            {date}
          </AppText>
        </View>
      </View>

      {onDelete ? (
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${title}`}
          hitSlop={8}
          android_ripple={{ color: theme.color.accentSoft, borderless: true }}
          style={{
            width: 32,
            height: 32,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.radius.pill,
          }}
          testID={testID ? `${testID}-delete` : undefined}
        >
          <Icon icon={Cancel01Icon} size={16} color={theme.color.textPrimary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}
