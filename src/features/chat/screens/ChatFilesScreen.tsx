import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cancel01Icon, Download01Icon } from '@hugeicons/core-free-icons';
import { useShallow } from 'zustand/react/shallow';

import { useChatStore } from '../store/chatStore';

import { formatRowDate, formatRowTime } from '@/shared/format';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import MetaListRow from '@/shared/ui/MetaListRow';
import ScreenHeader from '@/shared/ui/ScreenHeader';

/*
 * Files in chat (Figma 184:2882) — every attachment on the OPEN conversation,
 * each with a download and a remove action.
 *
 * The list is empty in practice today and that is not a bug: nothing writes
 * attachments yet (the composer's picker is a TODO pending expo-document-picker
 * and the upload endpoint), so the screen renders its empty state. The layout,
 * the row actions and the store operation are final — only the source is
 * missing, and wiring the picker later fills this screen with no changes here.
 */
const CONTENT_WIDTH = 370;

export default function ChatFilesScreen(): React.JSX.Element {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const activeId = useChatStore((state) => state.activeId);
  const conversations = useChatStore(useShallow((state) => state.conversations));
  const removeAttachment = useChatStore((state) => state.removeAttachment);

  const conversation = conversations.find((item) => item.id === activeId) ?? null;
  const attachments = conversation?.attachments ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <ScreenHeader title={t('chat.files.title')} />

      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          paddingTop: theme.space.xl,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: theme.space.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: CONTENT_WIDTH, gap: theme.space.sm }}>
          {attachments.length === 0 ? (
            <AppText
              style={{
                ...theme.type.caption,
                color: theme.color.textSecondary,
                textAlign: 'center',
              }}
              testID="files-empty"
            >
              {t('chat.files.empty')}
            </AppText>
          ) : (
            attachments.map((attachment, index) => (
              <MetaListRow
                key={attachment.id}
                title={attachment.name}
                time={formatRowTime(attachment.at, i18n.language)}
                date={formatRowDate(attachment.at, i18n.language)}
                divider={index < attachments.length - 1}
                actions={[
                  {
                    id: 'download',
                    icon: Download01Icon,
                    label: t('chat.files.download', { name: attachment.name }),
                    onPress: () => {
                      // TODO(backend): needs a signed download URL + expo-file-system.
                    },
                  },
                  {
                    id: 'remove',
                    icon: Cancel01Icon,
                    label: t('chat.files.remove', { name: attachment.name }),
                    onPress: () => {
                      if (conversation) removeAttachment(conversation.id, attachment.id);
                    },
                  },
                ]}
                testID={`file-row-${attachment.id}`}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
