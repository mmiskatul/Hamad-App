import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Attachment01Icon, Cancel01Icon, SentIcon } from '@hugeicons/core-free-icons';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import AppButton from '@/shared/ui/AppButton';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import IconPillButton from '@/shared/ui/IconPillButton';
import TextField from '@/shared/ui/TextField';
import ScreenHeader from '@/shared/ui/ScreenHeader';

/*
 * Contact Support (Figma 140:2044): a Subject line, a message box that fills the
 * remaining height, a row of removable attachment chips, and an attach + Send
 * pair pinned to the bottom.
 *
 * The message box takes the leftover space rather than a fixed height (Figma
 * gives it flex:1 inside a 714pt column) — on a short device it shrinks instead
 * of pushing Send off screen, and the keyboard-avoiding view handles the rest.
 *
 * Send is disabled until there is both a subject and a message: a support
 * ticket with an empty body is a round trip for the user and a dead ticket for
 * whoever answers it.
 *
 * TODO(backend): attachments need expo-document-picker and an upload endpoint,
 * and submitting needs the support module. The chips render from local state so
 * the layout and the remove interaction are final; only the source changes.
 */
const CONTENT_WIDTH = 370;

export default function ContactSupportScreen(): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<readonly string[]>([]);

  const canSend = subject.trim().length > 0 && message.trim().length > 0;

  const removeAttachment = useCallback((name: string) => {
    setAttachments((current) => current.filter((item) => item !== name));
  }, []);

  const onSend = useCallback(() => {
    // TODO(backend): POST the ticket, then surface success/failure. Clearing and
    // leaving optimistically would lose the message if the request failed.
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/about');
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <ScreenHeader title={t('settings.support.title')} fallbackHref="/about" />

      <KeyboardAvoider style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: 'center', paddingTop: theme.space.lg }}>
          <View
            style={{
              flex: 1,
              width: '100%',
              maxWidth: CONTENT_WIDTH,
              paddingHorizontal: theme.space.lg,
              paddingBottom: insets.bottom + theme.space.xl,
            }}
          >
            <View style={{ flex: 1, gap: theme.space.lg }}>
              <TextField
                placeholder={t('settings.support.subject')}
                value={subject}
                onChangeText={setSubject}
                testID="support-subject"
              />
              <TextField
                placeholder={t('settings.support.message')}
                value={message}
                onChangeText={setMessage}
                multiline
                fill
                testID="support-message"
              />
            </View>

            <View style={{ paddingTop: 20, gap: 10 }}>
              {attachments.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.space.md }}>
                  {attachments.map((name) => (
                    <AttachmentChip
                      key={name}
                      name={name}
                      onRemove={() => removeAttachment(name)}
                    />
                  ))}
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <IconPillButton
                  icon={Attachment01Icon}
                  size={52}
                  iconSize={24}
                  filled
                  accessibilityLabel={t('settings.support.attach')}
                  testID="support-attach"
                  onPress={() => {
                    // TODO(backend): expo-document-picker + upload endpoint.
                  }}
                />
                <AppButton
                  label={t('settings.support.send')}
                  icon={SentIcon}
                  fill
                  disabled={!canSend}
                  onPress={onSend}
                  testID="support-send"
                />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoider>
    </View>
  );
}

/* Removable attachment chip (Figma 295:1276): bg/surface, 4pt radius, 8/2 padding. */
function AttachmentChip({
  name,
  onRemove,
}: {
  name: string;
  onRemove: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.sm,
        paddingHorizontal: theme.space.sm,
        paddingVertical: 2,
        borderRadius: theme.radius.sm,
        backgroundColor: theme.color.surface,
      }}
    >
      <AppText style={{ ...theme.type.caption, color: theme.color.textPrimary }}>{name}</AppText>
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('settings.support.removeAttachment', { name })}
        testID={`support-attachment-remove-${name}`}
      >
        <Icon icon={Cancel01Icon} size={16} color={theme.color.textPrimary} />
      </Pressable>
    </View>
  );
}
