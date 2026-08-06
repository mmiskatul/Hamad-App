import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpen02Icon,
  Crown02Icon,
  InformationCircleIcon,
  Moon02Icon,
  PencilEdit02Icon,
  PieChartIcon,
  SecurityCheckIcon,
  ServerStack01Icon,
  TranslateIcon,
} from '@hugeicons/core-free-icons';

import ProfileAvatar from '../components/ProfileAvatar';
import SettingRow from '../components/SettingRow';

import { usePlan } from '@/shared/plan';
import { refreshProfile, useProfileStore } from '@/shared/profile';
import { useTheme, useThemeStore, type ThemePreference } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import LanguageToggle from '@/shared/ui/LanguageToggle';
import ScreenHeader from '@/shared/ui/ScreenHeader';
import { logoutCurrentSession } from '@/services/logout';

/*
 * Profile / settings hub (Figma 140:1461).
 *
 * Figma: back pill, 92pt avatar with a pencil badge, name + email centred, then
 * a 371-wide stack of bg/surface rows with 12pt gaps.
 *
 * TWO ROW BEHAVIOURS, and the chevron says which: Language and Appearance point
 * DOWN (they resolve in place), everything else points forward (it pushes a
 * screen). The expanded panels are NOT in the design — the file has no frame for
 * either open state — so they are built here as in-card panels reusing controls
 * that already exist (the shared LanguageToggle, and a three-way appearance
 * segment matching themeStore's 'system' | 'light' | 'dark').
 *
 * Only ONE panel may be open at a time — same rule as the chat screen's
 * surfaces, for the same reason: two open accordions in an 8-row list means the
 * row you tapped scrolls off screen.
 *
 * Language and Appearance are deliberately device-local preferences. Memory,
 * Usage, Change Password, profile data, and logout use authenticated backend APIs.
 */
const CONTENT_WIDTH = 371;
const ROW_GAP = 12;

type Panel = 'none' | 'language' | 'appearance';

export default function ProfileScreen(): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const name = useProfileStore((state) => state.name);
  const email = useProfileStore((state) => state.email);
  const phone = useProfileStore((state) => state.phone);
  const plan = usePlan();

  const [panel, setPanel] = useState<Panel>('none');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    // Persisted values paint immediately; the server then replaces them with
    // the authenticated account's current profile (including phone/avatar).
    refreshProfile().catch(() => {
      // Keep the cached profile usable while offline. Editing surfaces errors.
    });
  }, []);

  const toggle = useCallback(
    (next: Exclude<Panel, 'none'>) => setPanel((current) => (current === next ? 'none' : next)),
    [],
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <ScreenHeader />

      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileAvatar
          badgeIcon={PencilEdit02Icon}
          badgeLabel={t('settings.profile.edit')}
          onPressBadge={() => router.push('/profile-edit')}
        />

        <View style={{ alignItems: 'center', gap: 8, paddingTop: theme.space.lg }}>
          <AppText style={{ ...theme.type.body, color: theme.color.textPrimary }}>{name}</AppText>
          {/*
            Email + phone sit on `muted` pills (bg/muted), same pattern as the
            model selector — the muted fill reads as "secondary identity info"
            against the canvas, and the text stays in textPrimary so it is still
            legible inside the pill. A pure `textSecondary` line was the design
            that read like a placeholder.
          */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.color.muted,
              }}
              testID="profile-email-pill"
            >
              <AppText style={{ ...theme.type.caption, color: theme.color.textPrimary }}>
                {email}
              </AppText>
            </View>
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.color.muted,
              }}
              testID="profile-phone-pill"
            >
              <AppText style={{ ...theme.type.caption, color: theme.color.textPrimary }}>
                {phone}
              </AppText>
            </View>
          </View>
        </View>

        <View
          style={{
            width: '100%',
            maxWidth: CONTENT_WIDTH,
            gap: ROW_GAP,
            paddingTop: 32,
            paddingHorizontal: theme.space.lg,
          }}
        >
          <SettingRow
            icon={TranslateIcon}
            label={t('settings.rows.language')}
            trailing="expand"
            expanded={panel === 'language'}
            onPress={() => toggle('language')}
            testID="settings-language"
          >
            <LanguageToggle
              palette={{
                border: theme.color.border,
                activeBorder: theme.color.borderFocus,
                activeText: theme.color.accent,
                inactiveText: theme.color.textSecondary,
                ripple: theme.color.accentSoft,
              }}
              labelStyle={theme.type.caption}
              testID="settings-language-toggle"
            />
          </SettingRow>

          <SettingRow
            icon={Moon02Icon}
            label={t('settings.rows.appearance')}
            trailing="expand"
            expanded={panel === 'appearance'}
            onPress={() => toggle('appearance')}
            testID="settings-appearance"
          >
            <AppearanceChoices />
          </SettingRow>

          <SettingRow
            icon={BookOpen02Icon}
            label={t('settings.rows.memory')}
            testID="settings-memory"
            onPress={() => router.push('/memory')}
          />

          {/*
            NOTE: the prototype wires this row to the UPGRADE screen (140:2099
            -> 140:2217), which contradicts its own label and the existence of a
            separate "Usage dashboard" frame (142:496). Treated as a prototype
            slip, not a spec — the row goes where it says it goes.
          */}
          <SettingRow
            icon={PieChartIcon}
            label={t('settings.rows.usage')}
            testID="settings-usage"
            onPress={() => router.push('/usage')}
          />

          <SettingRow
            icon={Crown02Icon}
            label={t('settings.rows.upgrade')}
            caption={t(`chat.plan.${plan}Name`)}
            onPress={() => router.push('/upgrade')}
            testID="settings-upgrade"
          />

          <SettingRow
            icon={SecurityCheckIcon}
            label={t('settings.rows.password')}
            testID="settings-password"
            onPress={() => router.push('/change-password')}
          />

          <SettingRow
            icon={InformationCircleIcon}
            label={t('settings.rows.about')}
            onPress={() => router.push('/about')}
            testID="settings-about"
          />

          {/*
            Dev-tool row: lets a signed-in user repoint the mobile app at a
            different backend (e.g. when the LAN IP changes). Hidden behind the
            about row so the regular settings hierarchy still reads cleanly.
          */}
          <SettingRow
            icon={ServerStack01Icon}
            label={t('settings.serverSettings.title')}
            onPress={() => router.push('/server-settings')}
            testID="settings-server"
          />

          <SettingRow
            label={t('settings.rows.logout')}
            trailing="logout"
            testID="settings-logout"
            onPress={loggingOut ? undefined : async () => {
              setLoggingOut(true);
              try {
                await logoutCurrentSession();
              } finally {
                router.replace('/login');
                setLoggingOut(false);
              }
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

/*
 * Appearance panel. Three choices, not a two-way switch: 'system' is a real
 * preference ("follow the phone"), and losing it would make the OS setting
 * unreachable once the user had ever tapped light or dark.
 */
const APPEARANCE_OPTIONS: readonly ThemePreference[] = ['system', 'light', 'dark'];

function AppearanceChoices(): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  return (
    <View style={{ flexDirection: 'row', gap: theme.space.sm }} accessibilityRole="radiogroup">
      {APPEARANCE_OPTIONS.map((option) => {
        const active = option === preference;
        return (
          <View key={option} style={{ flex: 1 }}>
            <AppearanceChoice
              label={t(`settings.appearance.${option}`)}
              active={active}
              onPress={() => {
                setPreference(option);
              }}
              testID={`appearance-${option}`}
            />
          </View>
        );
      })}
    </View>
  );
}

function AppearanceChoice({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}): React.JSX.Element {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      android_ripple={{ color: theme.color.accentSoft }}
      style={{
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: active ? theme.color.borderFocus : theme.color.border,
        borderRadius: theme.radius.md,
        overflow: 'hidden',
      }}
      testID={testID}
    >
      <AppText
        style={{
          ...theme.type.caption,
          color: active ? theme.color.accent : theme.color.textSecondary,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
