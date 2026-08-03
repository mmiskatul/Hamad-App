import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cancel01Icon, Download01Icon } from '@hugeicons/core-free-icons';
import { useShallow } from 'zustand/react/shallow';

import { useChatStore } from '../store/chatStore';
import type { ChatAttachment } from '../store/chatStore';
import { attachmentAuthHeaders, openAttachment } from '../api/attachments';
import {
  deleteConversationAttachment,
  refreshConversationAttachments,
} from '../api/conversationApi';

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
  const [preview, setPreview] = useState<ChatAttachment | null>(null);
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const removeAttachment = useChatStore((state) => state.removeAttachment);

  const conversation = conversations.find((item) => item.id === activeId) ?? null;
  const attachments = conversation?.attachments ?? [];

  useEffect(() => {
    if (!activeId) return;
    void refreshConversationAttachments(activeId).catch(() => {});
  }, [activeId]);

  const open = useCallback(async (attachment: ChatAttachment) => {
    try {
      if (attachment.mimeType.startsWith('image/')) {
        setHeaders(await attachmentAuthHeaders());
        setPreview(attachment);
      } else {
        await openAttachment(attachment);
      }
    } catch (error) {
      Alert.alert('Could not open file', error instanceof Error ? error.message : 'Please try again.');
    }
  }, []);

  const remove = useCallback(async (attachment: ChatAttachment) => {
    if (!conversation) return;
    removeAttachment(conversation.id, attachment.id);
    try {
      await deleteConversationAttachment(conversation.id, attachment.id);
    } catch (error) {
      await refreshConversationAttachments(conversation.id).catch(() => {});
      Alert.alert('Could not remove file', error instanceof Error ? error.message : 'Please try again.');
    }
  }, [conversation, removeAttachment]);

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
                onPress={() => void open(attachment)}
                divider={index < attachments.length - 1}
                actions={[
                  {
                    id: 'download',
                    icon: Download01Icon,
                    label: t('chat.files.download', { name: attachment.name }),
                    onPress: () => void openAttachment(attachment).catch((error) => {
                      Alert.alert('Could not open file', error instanceof Error ? error.message : 'Please try again.');
                    }),
                  },
                  {
                    id: 'remove',
                    icon: Cancel01Icon,
                    label: t('chat.files.remove', { name: attachment.name }),
                    onPress: () => void remove(attachment),
                  },
                ]}
                testID={`file-row-${attachment.id}`}
              />
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={Boolean(preview)} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable
          onPress={() => setPreview(null)}
          accessibilityRole="button"
          accessibilityLabel="Close image preview"
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' }}
        >
          {preview?.uri ? (
            <Image
              source={{ uri: preview.uri, headers }}
              resizeMode="contain"
              style={{ width: '94%', height: '86%' }}
              accessibilityLabel={preview.name}
            />
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}
