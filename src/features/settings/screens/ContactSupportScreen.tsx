import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Attachment01Icon, Cancel01Icon, SentIcon } from '@hugeicons/core-free-icons';

import { submitSupportTicket } from '../api/settingsApi';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import AppButton from '@/shared/ui/AppButton';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import IconPillButton from '@/shared/ui/IconPillButton';
import TextField from '@/shared/ui/TextField';
import ScreenHeader from '@/shared/ui/ScreenHeader';

const CONTENT_WIDTH = 370;

export default function ContactSupportScreen(): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<readonly string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSend = subject.trim().length > 0 && message.trim().length > 0;

  const removeAttachment = useCallback((name: string) => {
    setAttachments((current) => current.filter((item) => item !== name));
  }, []);

  const onSend = useCallback(async () => {
    if (!canSend || submitting) return;

    setSubmitting(true);
    setErrorMessage(null);
    try {
      await submitSupportTicket(subject, message);
      if (router.canGoBack()) {
        router.back();
        return;
      }
      router.replace('/about');
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : 'Could not send your message. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [canSend, message, router, subject, submitting]);

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
                onChangeText={(next) => {
                  setMessage(next);
                  if (errorMessage) setErrorMessage(null);
                }}
                multiline
                fill
                testID="support-message"
              />
              {errorMessage ? (
                <AppText
                  style={{ ...theme.type.caption, color: theme.color.danger }}
                  testID="support-error"
                >
                  {errorMessage}
                </AppText>
              ) : null}
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
                    // Attachments still need a picker + upload endpoint.
                  }}
                />
                <AppButton
                  label={t('settings.support.send')}
                  icon={SentIcon}
                  fill
                  disabled={!canSend || submitting}
                  onPress={() => {
                    void onSend();
                  }}
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