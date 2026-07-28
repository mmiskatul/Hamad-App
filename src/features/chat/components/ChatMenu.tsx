import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import {
  Delete02Icon,
  File02Icon,
  PencilEdit02Icon,
  PinIcon,
  PinOffIcon,
  QuillWrite01Icon,
  Share01Icon,
} from '@hugeicons/core-free-icons';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import { Icon, type IconProps } from '@/shared/ui/Icon';
import Popover, { type PopoverAnchor, type PopoverOrigin } from '@/shared/ui/Popover';

/*
 * Per-chat menu (Figma "Menu chat" 183:857, and 185:3294).
 *
 * Anchoring: automatically anchors beside the ⋯ button on the trailing edge
 * (top-end / bottom-end) and flips vertically if near the bottom of the screen.
 */
const MENU_WIDTH = 168;
const MENU_PADDING_X = 16;
const MENU_PADDING_Y = 12;
const ITEM_GAP = 20;
const GLYPH_SIZE = 20;

export type ChatMenuAction =
  | 'new'
  | 'rename'
  | 'pin'
  | 'files'
  | 'share'
  | 'delete';

export type ChatMenuProps = {
  visible: boolean;
  onDismiss: () => void;
  /** Distance from the top of the screen to hang the card at. */
  top?: number;
  /** Explicit anchor configuration. */
  anchor?: PopoverAnchor;
  /** Explicit origin configuration. */
  origin?: PopoverOrigin;
  /** Edge alignment — defaults to 'end' for the top-right ⋯ button. */
  align?: 'start' | 'end';
  /** Drives the pin row's label and glyph. */
  pinned: boolean;
  onAction: (action: ChatMenuAction) => void;
};

export default function ChatMenu({
  visible,
  onDismiss,
  top = 0,
  anchor: customAnchor,
  origin: customOrigin,
  align = 'end',
  pinned,
  onAction,
}: ChatMenuProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();

  const isNearBottom = top > windowHeight - 320;

  const calculatedAnchor: PopoverAnchor =
    align === 'end'
      ? isNearBottom
        ? { end: 16, bottom: Math.max(16, windowHeight - top) }
        : { end: 16, top }
      : isNearBottom
        ? { start: 16, bottom: Math.max(16, windowHeight - top) }
        : { start: 16, top };

  const calculatedOrigin: PopoverOrigin =
    align === 'end'
      ? isNearBottom
        ? 'bottom-end'
        : 'top-end'
      : isNearBottom
        ? 'bottom-start'
        : 'top-start';

  const anchor = customAnchor ?? calculatedAnchor;
  const origin = customOrigin ?? calculatedOrigin;

  const items: ReadonlyArray<{
    id: ChatMenuAction;
    icon: IconProps['icon'];
    label: string;
    danger?: boolean;
  }> = [
    { id: 'new', icon: QuillWrite01Icon, label: t('chat.menuChat.new') },
    { id: 'rename', icon: PencilEdit02Icon, label: t('chat.menuChat.rename') },
    {
      id: 'pin',
      icon: pinned ? PinOffIcon : PinIcon,
      label: t(pinned ? 'chat.menuChat.unpin' : 'chat.menuChat.pin'),
    },
    { id: 'files', icon: File02Icon, label: t('chat.menuChat.files') },
    { id: 'share', icon: Share01Icon, label: t('chat.menuChat.share') },
    { id: 'delete', icon: Delete02Icon, label: t('chat.menuChat.delete'), danger: true },
  ];

  return (
    <Popover
      visible={visible}
      onDismiss={onDismiss}
      anchor={anchor}
      origin={origin}
      width={MENU_WIDTH}
      scrimLabel={t('chat.menuChat.close')}
      testID="chat-menu"
    >
      <View
        style={{
          paddingHorizontal: MENU_PADDING_X,
          paddingVertical: MENU_PADDING_Y,
          gap: ITEM_GAP,
        }}
      >
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              // Close first so the menu is never still up behind whatever the
              // action opens (a dialog, a pushed screen).
              onDismiss();
              onAction(item.id);
            }}
            accessibilityRole="button"
            hitSlop={6}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.lg }}
            testID={`chat-menu-${item.id}`}
          >
            <Icon
              icon={item.icon}
              size={GLYPH_SIZE}
              color={item.danger ? theme.color.danger : theme.color.textPrimary}
            />
            <AppText
              style={{
                ...theme.type.body,
                color: item.danger ? theme.color.danger : theme.color.textPrimary,
              }}
            >
              {item.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </Popover>
  );
}
