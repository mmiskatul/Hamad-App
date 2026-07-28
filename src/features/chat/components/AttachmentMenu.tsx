import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Attachment01Icon, Camera01Icon, Image01Icon } from '@hugeicons/core-free-icons';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import Popover, { type PopoverAnchor, type PopoverOrigin } from '@/shared/ui/Popover';

/*
 * Attachment menu — Camera / Photos / Files, opened by the composer's + button.
 *
 * Not a bottom sheet: the reference shows a small card sitting just ABOVE the +
 * button on the leading edge, so it grows out of that corner (bottom-start).
 *
 * Positioning and motion now come from shared/ui/Popover, which every anchored
 * menu in the app uses — this file only decides WHERE it hangs and WHAT is in
 * it. The card is anchored relative to the composer rather than measured
 * against it: the composer sits a fixed distance off the bottom inset, so the
 * anchor is stable without a measurement pass.
 */
const MENU_WIDTH = 220;
const MENU_RADIUS = 20;
/* Distance off bottom inset — sits right above the + button on the leading edge. */
const ANCHOR_BOTTOM = 52;
const ITEM_CHIP = 36;

export type AttachmentSource = 'camera' | 'photos' | 'files';

export type AttachmentMenuProps = {
  visible: boolean;
  onDismiss: () => void;
  onPick: (source: AttachmentSource) => void;
  anchor?: PopoverAnchor;
  origin?: PopoverOrigin;
};

export default function AttachmentMenu({
  visible,
  onDismiss,
  onPick,
  anchor: customAnchor,
  origin: customOrigin,
}: AttachmentMenuProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const items = [
    { id: 'camera' as const, icon: Camera01Icon, label: t('chat.attachments.camera') },
    { id: 'photos' as const, icon: Image01Icon, label: t('chat.attachments.photos') },
    { id: 'files' as const, icon: Attachment01Icon, label: t('chat.attachments.files') },
  ];

  const defaultAnchor: PopoverAnchor = { start: 16, bottom: insets.bottom + ANCHOR_BOTTOM };
  const defaultOrigin: PopoverOrigin = 'bottom-start';

  return (
    <Popover
      visible={visible}
      onDismiss={onDismiss}
      anchor={customAnchor ?? defaultAnchor}
      origin={customOrigin ?? defaultOrigin}
      width={MENU_WIDTH}
      radius={MENU_RADIUS}
      scrimLabel={t('chat.attachments.close')}
      testID="attachment-menu"
    >
      <View style={{ paddingVertical: theme.space.sm }}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => {
              onDismiss();
              onPick(item.id);
            }}
            accessibilityRole="button"
            android_ripple={{ color: theme.color.accentSoft }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.space.md,
              paddingHorizontal: theme.space.lg,
              paddingVertical: theme.space.md,
            }}
            testID={`attachment-${item.id}`}
          >
            <View
              style={{
                width: ITEM_CHIP,
                height: ITEM_CHIP,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: theme.radius.pill,
                backgroundColor: theme.color.muted,
              }}
            >
              <Icon icon={item.icon} size={20} color={theme.color.textPrimary} />
            </View>
            <AppText style={{ ...theme.type.body, color: theme.color.textPrimary }}>
              {item.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </Popover>
  );
}
