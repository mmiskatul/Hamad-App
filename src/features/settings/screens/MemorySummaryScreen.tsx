import React, { useCallback, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUp02Icon, Delete02Icon } from '@hugeicons/core-free-icons';

import { useMemoryStore } from '@/shared/memory';

import { formatRowTime } from '@/shared/format';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import { AppText } from '@/shared/ui/AppText';
import ConfirmDialog from '@/shared/ui/ConfirmDialog';
import IconPillButton from '@/shared/ui/IconPillButton';
import ScreenHeader from '@/shared/ui/ScreenHeader';
import { appendMemorySummary, clearMemorySummary } from '../api/settingsApi';

/*
 * Memory summary (Figma 187:824) — what the assistant currently believes about
 * the user, with a way to add to it and a way to throw it away.
 *
 * Figma: back pill + 🗑 pill, "Memory summary" over an "UPDATED 9:48 PM" label,
 * an "Overview" heading with a paragraph, and a 370-wide "Add or update" pill
 * pinned near the bottom with a 32pt ↑ button on its end edge.
 *
 * The design draws that pill as static text; it is a real composer here, since
 * the label is a verb and a screen whose only affordance does nothing is worse
 * than one that has none. Submitting appends a note and stamps the UPDATED time.
 *
 * DELETION IS CONFIRMED, unlike the ✕ on a chat row. That deliberate difference:
 * a chat is something the user wrote and can see going; the summary is
 * accumulated state they never authored directly and cannot rebuild, so a
 * mis-tap on a 52pt pill must not be able to destroy it. The design has no
 * confirmation frame — this uses the shared ConfirmDialog.
 *
 * EMPTY STATE: with nothing learned yet the overview shows the generic
 * explanation, which is exactly the copy the Figma frame displays — the frame is
 * the empty state, not a populated example.
 */
const CONTENT_WIDTH = 370;
const COMPOSER_MIN_HEIGHT = 52;

export default function MemorySummaryScreen(): React.JSX.Element {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const summary = useMemoryStore((state) => state.summary);
  const updatedAt = useMemoryStore((state) => state.summaryUpdatedAt);
  const appendSummary = useMemoryStore((state) => state.appendSummary);
  const clearSummary = useMemoryStore((state) => state.clearSummary);
  const replaceMemory = useMemoryStore((state) => state.replaceMemory);

  const [draft, setDraft] = useState('');
  const [confirming, setConfirming] = useState(false);

  const canSend = draft.trim().length > 0;

  const onSend = useCallback(async () => {
    if (!canSend) return;
    const text = draft;
    appendSummary(text);
    setDraft('');
    try {
      const memory = await appendMemorySummary(text);
      replaceMemory({ ...memory, summaryUpdatedAt: memory.summaryUpdatedAt ? Date.parse(memory.summaryUpdatedAt) : null });
    } catch {
      // The optimistic local note remains visible and can be retried later.
    }
  }, [canSend, appendSummary, replaceMemory, draft]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <ScreenHeader
        title={t('settings.memory.summary')}
        subtitle={
          updatedAt
            ? t('settings.memory.updatedAt', { time: formatRowTime(updatedAt, i18n.language) })
            : undefined
        }
        fallbackHref="/memory"
        actions={[
          {
            id: 'clear',
            icon: Delete02Icon,
            label: t('settings.memory.clear'),
            danger: true,
            disabled: !summary,
            onPress: () => setConfirming(true),
          },
        ]}
      />

      <KeyboardAvoider style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            alignItems: 'center',
            paddingTop: theme.space.xl,
            paddingBottom: theme.space.xl,
            paddingHorizontal: theme.space.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: '100%', maxWidth: CONTENT_WIDTH, gap: theme.space.md }}>
            <AppText style={{ ...theme.type.h4, color: theme.color.textPrimary }}>
              {t('settings.memory.overview')}
            </AppText>
            <AppText
              style={{ ...theme.type.body, color: theme.color.textSecondary }}
              testID="memory-overview-body"
            >
              {summary || t('settings.memory.summaryHelp')}
            </AppText>
          </View>
        </ScrollView>

        {/* Composer, pinned above the home indicator. */}
        <View
          style={{
            alignItems: 'center',
            paddingHorizontal: theme.space.lg,
            paddingBottom: insets.bottom + theme.space.md,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: CONTENT_WIDTH,
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: COMPOSER_MIN_HEIGHT,
              paddingStart: theme.space.xl,
              paddingEnd: theme.space.sm,
              paddingVertical: 5,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.color.surface,
            }}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t('settings.memory.addPlaceholder')}
              placeholderTextColor={theme.color.textSecondary}
              selectionColor={theme.color.accent}
              returnKeyType="send"
              onSubmitEditing={onSend}
              style={{
                ...theme.type.body,
                flex: 1,
                color: theme.color.textPrimary,
                padding: 0,
              }}
              testID="memory-add-input"
            />

            {/* Absent rather than disabled until there is something to send —
                same rule as the chat composer's send chip. */}
            {canSend ? (
              <IconPillButton
                icon={ArrowUp02Icon}
                size={32}
                iconSize={16}
                filled
                accessibilityLabel={t('settings.memory.add')}
                onPress={onSend}
                testID="memory-add-send"
              />
            ) : null}
          </View>
        </View>
      </KeyboardAvoider>

      <ConfirmDialog
        visible={confirming}
        title={t('settings.memory.clearTitle')}
        body={t('settings.memory.clearBody')}
        confirmLabel={t('settings.memory.clear')}
        onConfirm={() => {
          clearSummary();
          clearMemorySummary().catch(() => {
            // Clearing remains reflected locally; a later refresh reconciles the server.
          });
        }}
        onDismiss={() => setConfirming(false)}
        testID="memory-clear-confirm"
      />
    </View>
  );
}
