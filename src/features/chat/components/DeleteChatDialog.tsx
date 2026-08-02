import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import AppButton from '@/shared/ui/AppButton';
import { AppText } from '@/shared/ui/AppText';
import Dialog from '@/shared/ui/Dialog';

/*
 * Delete chat confirmation dialog.
 *
 * Prompts the user before permanently deleting a conversation history.
 */
export type DeleteChatDialogProps = {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
};

export default function DeleteChatDialog({
  visible,
  onDismiss,
  onConfirm,
  loading = false,
  error = null,
}: DeleteChatDialogProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Dialog
      visible={visible}
      onDismiss={loading ? () => undefined : onDismiss}
      scrimLabel={t('common.cancel')}
      testID="delete-chat-dialog"
    >
      <View style={{ gap: theme.space.lg }}>
        <AppText style={{ ...theme.type.h4, color: theme.color.textPrimary }}>
          {t('chat.deleteDialog.title')}
        </AppText>

        <AppText style={{ ...theme.type.body, color: theme.color.textSecondary }}>
          {t('chat.deleteDialog.message')}
        </AppText>

        {error ? (
          <AppText
            style={{ ...theme.type.caption, color: theme.color.danger }}
            testID="delete-chat-error"
          >
            {error}
          </AppText>
        ) : null}

        <View style={{ flexDirection: 'row', gap: theme.space.lg, paddingTop: theme.space.md }}>
          <AppButton
            label={t('chat.deleteDialog.cancel')}
            variant="ghost"
            fill
            disabled={loading}
            onPress={onDismiss}
            testID="delete-chat-cancel"
          />
          <AppButton
            label={t('chat.deleteDialog.confirm')}
            variant="danger"
            fill
            loading={loading}
            onPress={onConfirm}
            testID="delete-chat-confirm"
          />
        </View>
      </View>
    </Dialog>
  );
}
