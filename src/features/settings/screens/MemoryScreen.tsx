import React, { useCallback, useEffect, useState } from 'react';
import { I18nManager, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft01Icon, ArrowRight01Icon, Tick02Icon } from '@hugeicons/core-free-icons';

import { useMemoryStore } from '../store/memoryStore';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import ScreenHeader from '@/shared/ui/ScreenHeader';
import TextField from '@/shared/ui/TextField';
import Toggle from '@/shared/ui/Toggle';
import { getMemory, updateMemory } from '../api/settingsApi';

/*
 * Memory settings (Figma 185:3164).
 *
 * Figma: back pill + a ✓ pill in the header, then a 371-wide column — an
 * "Enable memory" card with a switch, a helper paragraph, a "Memory summary"
 * card that pushes forward, another paragraph, and three labelled fields
 * (nickname, occupation, and a 208pt free-text box).
 *
 * DRAFT-THEN-CONFIRM, which is what the ✓ is for: the three text fields are
 * local state and only reach the store when the check is tapped. The switch is
 * NOT part of that draft — it commits immediately, because a switch that does
 * not move until you press something else reads as broken, and because
 * "memory off" is a privacy action that should never wait on a second tap.
 *
 * The fields stay editable while memory is off. Turning the feature off means
 * "stop using this", not "you may no longer describe yourself"; the store keeps
 * the values either way, and clearing is the summary screen's explicit action.
 */
const CONTENT_WIDTH = 371;
const ABOUT_HEIGHT = 208;
const CHEVRON_HIT = 44;

export default function MemoryScreen(): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const enabled = useMemoryStore((state) => state.enabled);
  const setEnabled = useMemoryStore((state) => state.setEnabled);
  const setProfile = useMemoryStore((state) => state.setProfile);
  const replaceMemory = useMemoryStore((state) => state.replaceMemory);

  // Seeded once from the store — a seed, not a subscription, so a later write
  // cannot yank text out from under someone who is typing.
  const [nickname, setNickname] = useState(() => useMemoryStore.getState().nickname);
  const [occupation, setOccupation] = useState(() => useMemoryStore.getState().occupation);
  const [about, setAbout] = useState(() => useMemoryStore.getState().about);

  useEffect(() => {
    getMemory().then((memory) => {
      const next = {
        ...memory,
        summaryUpdatedAt: memory.summaryUpdatedAt ? Date.parse(memory.summaryUpdatedAt) : null,
      };
      replaceMemory(next);
      setNickname(next.nickname);
      setOccupation(next.occupation);
      setAbout(next.about);
    }).catch(() => {
      // Keep the device cache available while offline.
    });
  }, [replaceMemory]);

  const onConfirm = useCallback(async () => {
    const patch = { nickname: nickname.trim(), occupation: occupation.trim(), about: about.trim() };
    setProfile(patch);
    try {
      const memory = await updateMemory(patch);
      replaceMemory({ ...memory, summaryUpdatedAt: memory.summaryUpdatedAt ? Date.parse(memory.summaryUpdatedAt) : null });
      router.back();
    } catch {
      // Preserve the draft locally so the user can retry after reconnecting.
    }
  }, [setProfile, replaceMemory, nickname, occupation, about, router]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <ScreenHeader
        title={t('settings.memory.title')}
        fallbackHref="/profile"
        actions={[
          {
            id: 'confirm',
            icon: Tick02Icon,
            label: t('common.save'),
            onPress: onConfirm,
          },
        ]}
      />

      <KeyboardAvoider style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            alignItems: 'center',
            paddingTop: theme.space.xl,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: theme.space.lg,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: '100%', maxWidth: CONTENT_WIDTH, gap: theme.space.md }}>
            <Card>
              <AppText style={{ ...theme.type.body, color: theme.color.textPrimary }}>
                {t('settings.memory.enable')}
              </AppText>
              <Toggle
                value={enabled}
                onValueChange={(next) => {
                  setEnabled(next);
                  updateMemory({ enabled: next }).catch(() => setEnabled(!next));
                }}
                accessibilityLabel={t('settings.memory.enable')}
                testID="memory-enable"
              />
            </Card>

            <Helper>{t('settings.memory.enableHelp')}</Helper>

            <Card>
              <AppText style={{ ...theme.type.body, color: theme.color.textPrimary }}>
                {t('settings.memory.summary')}
              </AppText>
              <Pressable
                onPress={() => router.push('/memory-summary')}
                accessibilityRole="button"
                accessibilityLabel={t('settings.memory.summary')}
                android_ripple={{ color: theme.color.accentSoft, borderless: true }}
                style={{
                  width: CHEVRON_HIT,
                  height: CHEVRON_HIT,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                testID="memory-summary-link"
              >
                {/* A direction, not a glyph — mirrors with the writing direction. */}
                <Icon
                  icon={I18nManager.isRTL ? ArrowLeft01Icon : ArrowRight01Icon}
                  size={20}
                  color={theme.color.textPrimary}
                />
              </Pressable>
            </Card>

            <Helper>{t('settings.memory.summaryHelp')}</Helper>

            <View style={{ gap: theme.space.xl }}>
              <Labelled label={t('settings.memory.nickname')}>
                <TextField
                  variant="filled"
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder={t('settings.memory.nicknamePlaceholder')}
                  autoCapitalize="words"
                  testID="memory-nickname"
                />
              </Labelled>

              <Labelled label={t('settings.memory.occupation')}>
                <TextField
                  variant="filled"
                  value={occupation}
                  onChangeText={setOccupation}
                  placeholder={t('settings.memory.occupationPlaceholder')}
                  autoCapitalize="sentences"
                  testID="memory-occupation"
                />
              </Labelled>

              <Labelled label={t('settings.memory.about')}>
                <TextField
                  variant="filled"
                  value={about}
                  onChangeText={setAbout}
                  placeholder={t('settings.memory.aboutPlaceholder')}
                  multiline
                  height={ABOUT_HEIGHT}
                  testID="memory-about"
                />
              </Labelled>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoider>
    </View>
  );
}

/* bg/surface row, 12pt radius, label at the start and a control on the end. */
function Card({ children }: { children: React.ReactNode }): React.JSX.Element {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingStart: theme.space.lg,
        paddingEnd: theme.space.sm,
        paddingVertical: theme.space.sm,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.color.surface,
      }}
    >
      {children}
    </View>
  );
}

/* The explanatory paragraph under a card (Figma 187:807 / 187:808). */
function Helper({ children }: { children: string }): React.JSX.Element {
  const theme = useTheme();

  return (
    <AppText
      style={{
        ...theme.type.body,
        color: theme.color.textSecondary,
        paddingHorizontal: theme.space.lg,
        paddingBottom: 20,
      }}
    >
      {children}
    </AppText>
  );
}

function Labelled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space.sm }}>
      <AppText
        style={{
          ...theme.type.body,
          color: theme.color.textSecondary,
          paddingHorizontal: theme.space.lg,
        }}
      >
        {label}
      </AppText>
      {children}
    </View>
  );
}
