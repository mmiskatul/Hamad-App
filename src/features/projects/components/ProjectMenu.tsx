import React from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import {
  Database01Icon,
  Delete02Icon,
  File02Icon,
  PencilEdit02Icon,
  PinIcon,
  PinOffIcon,
  QuillWrite01Icon,
  Settings02Icon,
  Share01Icon,
} from '@hugeicons/core-free-icons';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import { Icon, type IconProps } from '@/shared/ui/Icon';
import Popover, { type PopoverAnchor, type PopoverOrigin } from '@/shared/ui/Popover';

/*
 * Per-project menu (Figma "Menu Project" 152:1913, and 185:3248).
 *
 * Anchoring: automatically anchors beside the button on trailing or leading edge
 * and flips vertically if near the bottom of the screen.
 */
const MENU_WIDTH = 189;
const MENU_PADDING_X = 16;
const MENU_PADDING_Y = 12;
const ITEM_GAP = 20;
const GLYPH_SIZE = 20;

export type ProjectMenuAction =
  | 'newChat'
  | 'rename'
  | 'pin'
  | 'sources'
  | 'files'
  | 'instructions'
  | 'share'
  | 'delete';

export type ProjectMenuProps = {
  visible: boolean;
  onDismiss: () => void;
  top?: number;
  anchor?: PopoverAnchor;
  origin?: PopoverOrigin;
  align?: 'start' | 'end';
  pinned: boolean;
  onAction: (action: ProjectMenuAction) => void;
};

export default function ProjectMenu({
  visible,
  onDismiss,
  top = 0,
  anchor: customAnchor,
  origin: customOrigin,
  align = 'end',
  pinned,
  onAction,
}: ProjectMenuProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();

  const isNearBottom = top > windowHeight - 360;

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
    id: ProjectMenuAction;
    icon: IconProps['icon'];
    label: string;
    danger?: boolean;
  }> = [
    { id: 'newChat', icon: QuillWrite01Icon, label: t('projects.menu.newChat') },
    { id: 'rename', icon: PencilEdit02Icon, label: t('projects.menu.rename') },
    {
      id: 'pin',
      icon: pinned ? PinOffIcon : PinIcon,
      label: t(pinned ? 'projects.menu.unpin' : 'projects.menu.pin'),
    },
    { id: 'sources', icon: Database01Icon, label: t('projects.menu.sources') },
    { id: 'files', icon: File02Icon, label: t('projects.menu.files') },
    { id: 'instructions', icon: Settings02Icon, label: t('projects.menu.instructions') },
    { id: 'share', icon: Share01Icon, label: t('projects.menu.share') },
    { id: 'delete', icon: Delete02Icon, label: t('projects.menu.delete'), danger: true },
  ];

  return (
    <Popover
      visible={visible}
      onDismiss={onDismiss}
      anchor={anchor}
      origin={origin}
      width={MENU_WIDTH}
      scrimLabel={t('projects.menu.close')}
      testID="project-menu"
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
              onDismiss();
              onAction(item.id);
            }}
            accessibilityRole="button"
            hitSlop={6}
            style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.lg }}
            testID={`project-menu-${item.id}`}
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
