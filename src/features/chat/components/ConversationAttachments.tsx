import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, View } from 'react-native';
import { Attachment01Icon } from '@hugeicons/core-free-icons';

import { attachmentAuthHeaders, openAttachment } from '../api/attachments';
import type { ChatAttachment } from '../store/chatStore';
import { useTheme } from '@/shared/theme';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';

export default function ConversationAttachments({
  attachments,
}: {
  attachments: readonly ChatAttachment[];
}): React.JSX.Element | null {
  const theme = useTheme();
  const [headers, setHeaders] = useState<Record<string, string> | undefined>(undefined);
  const [preview, setPreview] = useState<ChatAttachment | null>(null);

  const hasImages = attachments.some((item) => item.mimeType.startsWith('image/'));

  useEffect(() => {
    let active = true;
    if (hasImages) {
      void attachmentAuthHeaders().then((resolved) => {
        if (active) setHeaders(resolved);
      });
    } else {
      setHeaders({});
    }
    return () => {
      active = false;
    };
  }, [attachments, hasImages]);

  const open = useCallback(async (attachment: ChatAttachment) => {
    try {
      if (attachment.mimeType.startsWith('image/')) setPreview(attachment);
      else await openAttachment(attachment);
    } catch (error) {
      Alert.alert('Could not open file', error instanceof Error ? error.message : 'Please try again.');
    }
  }, []);

  if (!attachments.length) return null;
  if (hasImages && !headers) return null;

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
        {attachments.map((attachment) => (
          <Pressable
            key={attachment.id}
            onPress={() => void open(attachment)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${attachment.name}`}
            style={{
              width: 112,
              height: 72,
              borderRadius: theme.radius.md,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: theme.color.border,
              backgroundColor: theme.color.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {attachment.mimeType.startsWith('image/') && attachment.uri ? (
              <Image source={{ uri: attachment.uri, headers }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
            ) : (
              <View style={{ alignItems: 'center', gap: 4, padding: 8 }}>
                <Icon icon={Attachment01Icon} size={20} color={theme.color.textPrimary} />
                <AppText numberOfLines={1} style={{ ...theme.type.tag, color: theme.color.textSecondary }}>
                  {attachment.name}
                </AppText>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={Boolean(preview)} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <Pressable
          onPress={() => setPreview(null)}
          accessibilityRole="button"
          accessibilityLabel="Close image preview"
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' }}
        >
          {preview?.uri ? (
            <Image source={{ uri: preview.uri, headers }} resizeMode="contain" style={{ width: '94%', height: '86%' }} />
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}
