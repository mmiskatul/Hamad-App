import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { File02Icon, HeadsetIcon, Shield01Icon } from '@hugeicons/core-free-icons';

import SettingRow from '../components/SettingRow';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import ScreenHeader from '@/shared/ui/ScreenHeader';
import { AppText } from '@/shared/ui/AppText';
import { getAbout, type AboutResponse } from '../api/settingsApi';

/*
 * About (Figma 140:1726): the same header + row list as Profile, with the three
 * legal/support destinations. Reuses SettingRow verbatim — the design uses one
 * component in both screens, so the code does too.
 *
 * ICON SUBSTITUTION: the Figma layers name Material icons for two of these
 * (`hugeicons:file-02` is ours, but `ic:outline-privacy-tip` is not). The
 * project rule is Hugeicons only (mobile/CLAUDE.md), so privacy uses
 * Shield01Icon — closest equivalent glyph, one library.
 */
const CONTENT_WIDTH = 371;
const ROW_GAP = 12;

export default function AboutScreen(): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const [about, setAbout] = useState<AboutResponse | null>(null);

  useEffect(() => {
    getAbout().then(setAbout).catch(() => {
      // Legal and support navigation remain available if the API is offline.
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <ScreenHeader title={t('settings.about.title')} fallbackHref="/profile" />

      <View style={{ alignItems: 'center', paddingTop: theme.space.xl }}>
        <View
          style={{
            width: '100%',
            maxWidth: CONTENT_WIDTH,
            gap: ROW_GAP,
            paddingHorizontal: theme.space.lg,
          }}
        >
          <View
            style={{
              alignItems: 'center',
              gap: theme.space.xs,
              padding: theme.space.lg,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.color.surface,
            }}
            testID="about-app-info"
          >
            <AppText style={{ ...theme.type.h4, color: theme.color.textPrimary }}>
              {about?.name ?? 'OneAI Hub'}
            </AppText>
            <AppText style={{ ...theme.type.caption, color: theme.color.textSecondary }}>
              {t('settings.about.version', { version: about?.version ?? '1.0.0' })}
            </AppText>
            {about ? (
              <AppText style={{ ...theme.type.caption, color: theme.color.textSecondary }}>
                {about.supportEmail}
              </AppText>
            ) : null}
          </View>
          <SettingRow
            icon={File02Icon}
            label={t('settings.about.terms')}
            onPress={() => router.push('/terms')}
            testID="about-terms"
          />
          <SettingRow
            icon={Shield01Icon}
            label={t('settings.about.privacy')}
            onPress={() => router.push('/privacy')}
            testID="about-privacy"
          />
          <SettingRow
            icon={HeadsetIcon}
            label={t('settings.about.support')}
            onPress={() => router.push('/support')}
            testID="about-support"
          />
        </View>
      </View>
    </View>
  );
}
