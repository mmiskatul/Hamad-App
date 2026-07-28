import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import AppButton from './AppButton';
import { AppText } from './AppText';
import Dialog from './Dialog';

/*
 * "Are you sure?" on the shared Dialog surface.
 *
 * NOT IN FIGMA — the file has no confirmation frame; destructive affordances in
 * the design (the ✕ on a chat row, the 🗑 on the memory summary) act instantly.
 * That is fine for a chat, which the user authored and can see; it is not fine
 * for state the user never wrote by hand and cannot rebuild. Built from the
 * pieces the design system already defines (Dialog + the Cancel/confirm button
 * pair) so it reads as part of the same app.
 */
export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  body?: string;
  /** Label on the destructive action. */
  confirmLabel: string;
  onConfirm: () => void;
  onDismiss: () => void;
  testID?: string;
};

export default function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  onConfirm,
  onDismiss,
  testID,
}: ConfirmDialogProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Dialog
      visible={visible}
      onDismiss={onDismiss}
      scrimLabel={t('common.cancel')}
      testID={testID}
    >
      <View style={{ gap: theme.space.lg }}>
        <AppText style={{ ...theme.type.h4, color: theme.color.textPrimary }}>{title}</AppText>

        {body ? (
          <AppText style={{ ...theme.type.body, color: theme.color.textSecondary }}>{body}</AppText>
        ) : null}

        <View style={{ flexDirection: 'row', gap: theme.space.lg, paddingTop: theme.space.sm }}>
          <AppButton
            label={t('common.cancel')}
            variant="ghost"
            fill
            onPress={onDismiss}
            testID="confirm-cancel"
          />
          <AppButton
            label={confirmLabel}
            variant="danger"
            fill
            onPress={() => {
              onConfirm();
              onDismiss();
            }}
            testID="confirm-accept"
          />
        </View>
      </View>
    </Dialog>
  );
}
