import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PinIcon } from '@hugeicons/core-free-icons';

import { useTheme } from '@/shared/theme';
import { AppText } from './AppText';
import { Icon, type IconProps } from './Icon';

/*
 * The row shared by Recent Chat History (Figma 182:737), Files in chat
 * (184:3050) and Project sources (170:2091): a Body title over a "TIME • DATE"
 * caption, with one or two 32pt icon buttons on the end edge and a hairline
 * under each row but the last.
 *
 * Those screens are the same list with different trailing actions, so the
 * actions are a prop rather than three near-identical row components.
 *
 * Lives in shared/ui rather than features/chat (where it started) because the
 * projects feature renders the same row for its sources list, and features may
 * not import each other.
 *
 * The Figma meta text uses `elevation/shadow-tint` (#4C5361) — a SHADOW token
 * applied to type, which has no adaptive counterpart and fails contrast on the
 * dark canvas. Mapped to text/secondary, which is what it reads as in the dark
 * render.
 */
const ACTION_SIZE = 32;
const ACTION_GLYPH = 16;

export type MetaListRowAction = {
  id: string;
  icon: IconProps['icon'];
  label: string;
  onPress: () => void;
  danger?: boolean;
};

export type MetaListRowProps = {
  title: string;
  /** Pre-formatted "9:48 PM" and "DEC 7, 2026" halves. */
  time: string;
  date: string;
  /** Dim the title — history uses it for every chat but the open one. */
  dimmed?: boolean;
  /** Render pin icon on the left side of the title. */
  pinned?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  actions?: readonly MetaListRowAction[];
  /** Hairline below the row. False on the last one. */
  divider?: boolean;
  testID?: string;
};

export default function MetaListRow({
  title,
  time,
  date,
  dimmed = false,
  pinned = false,
  onPress,
  onLongPress,
  actions = [],
  divider = true,
  testID,
}: MetaListRowProps): React.JSX.Element {
  const theme = useTheme();

  return (
    <View style={{ width: '100%' }}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={!onPress && !onLongPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${time} ${date}`}
        android_ripple={{ color: theme.color.accentSoft }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space.sm,
          paddingVertical: theme.space.md,
        }}
        testID={testID}
      >
        <View style={{ flex: 1, gap: theme.space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xs }}>
            {pinned ? (
              <Icon
                icon={PinIcon}
                size={14}
                color={dimmed ? theme.color.textSecondary : theme.color.textPrimary}
              />
            ) : null}
            <AppText
              numberOfLines={1}
              style={{
                flex: 1,
                ...theme.type.body,
                color: dimmed ? theme.color.textSecondary : theme.color.textPrimary,
              }}
            >
              {title}
            </AppText>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MetaText>{time}</MetaText>
            {/* 3pt dot separator (Figma Ellipse 133). */}
            <View
              style={{
                width: 3,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: theme.color.textSecondary,
              }}
            />
            <MetaText>{date}</MetaText>
          </View>
        </View>

        {actions.map((action) => (
          <Pressable
            key={action.id}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            hitSlop={8}
            android_ripple={{ color: theme.color.accentSoft, borderless: true }}
            style={{
              width: ACTION_SIZE,
              height: ACTION_SIZE,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radius.pill,
            }}
            testID={`${testID}-${action.id}`}
          >
            <Icon
              icon={action.icon}
              size={ACTION_GLYPH}
              color={action.danger ? theme.color.danger : theme.color.textPrimary}
            />
          </Pressable>
        ))}
      </Pressable>

      {divider ? (
        <View
          style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.color.border }}
        />
      ) : null}
    </View>
  );
}

function MetaText({ children }: { children: string }): React.JSX.Element {
  const theme = useTheme();

  return (
    <AppText
      style={{
        ...theme.type.tag,
        color: theme.color.textSecondary,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </AppText>
  );
}
