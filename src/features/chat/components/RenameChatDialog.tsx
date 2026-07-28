import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import AppButton from '@/shared/ui/AppButton';
import { AppText } from '@/shared/ui/AppText';
import Dialog from '@/shared/ui/Dialog';
import TextField from '@/shared/ui/TextField';

/*
 * Rename a conversation, opened from the chat row menu's "Rename chat".
 *
 * NOT IN FIGMA for chats: the file has a "Rename project" screen (152:1914) but
 * nothing for renaming a chat, and the menu item exists regardless. This is
 * built from the pieces the design system already defines — the shared Dialog
 * surface, the notched TextField, and the Cancel/Save button pair from the
 * edit-profile screen — so it reads as part of the same app rather than a new
 * invention. The projects batch should reuse this rather than fork it.
 *
 * The draft is seeded from `title` every time the dialog OPENS (not just on
 * mount): the component stays mounted between openings, so without the effect
 * the second rename would start from the previous edit.
 */
export type RenameChatDialogProps = {
  visible: boolean;
  title: string;
  onDismiss: () => void;
  onSubmit: (title: string) => void;
};

export default function RenameChatDialog({
  visible,
  title,
  onDismiss,
  onSubmit,
}: RenameChatDialogProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const [draft, setDraft] = useState(title);

  useEffect(() => {
    if (visible) setDraft(title);
  }, [visible, title]);

  const valid = draft.trim().length > 0;

  const submit = useCallback(() => {
    if (!valid) return;
    onSubmit(draft.trim());
    onDismiss();
  }, [valid, onSubmit, draft, onDismiss]);

  return (
    <Dialog visible={visible} onDismiss={onDismiss} scrimLabel={t('common.cancel')}>
      <View style={{ gap: theme.space.xl }}>
        <AppText style={{ ...theme.type.h4, color: theme.color.textPrimary }}>
          {t('chat.rename.title')}
        </AppText>

        <TextField
          value={draft}
          onChangeText={setDraft}
          placeholder={t('chat.rename.placeholder')}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={submit}
          testID="rename-chat-input"
        />

        <View style={{ flexDirection: 'row', gap: theme.space.lg }}>
          <AppButton
            label={t('common.cancel')}
            variant="ghost"
            fill
            onPress={onDismiss}
            testID="rename-chat-cancel"
          />
          <AppButton
            label={t('common.save')}
            fill
            disabled={!valid}
            onPress={submit}
            testID="rename-chat-save"
          />
        </View>
      </View>
    </Dialog>
  );
}
