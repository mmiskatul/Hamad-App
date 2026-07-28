import React, { useCallback } from 'react';
import { View } from 'react-native';

import { useTranslation } from '@/shared/i18n/useTranslation';
import { useAuthPalette } from '../palette';
import { AUTH_TYPE } from '../constants';

import { AppText } from '@/shared/ui/AppText';

/*
 * Legal caption at the bottom of the onboarding screen. Reads as a single line
 * of body-caption text; the Terms and Conditions + Privacy Policy phrases are
 * pressable spans with no nav target yet (TODO — wiring deferred until the
 * Terms/Privacy route exists in the navigator).
 *
 * The links are nested <AppText onPress> spans, NOT nested <Pressable>s: a
 * Pressable inside a Text does not lay out inline on Android (it becomes a
 * block and shatters the sentence across lines). onPress on Text is RN's
 * supported inline-link primitive and keeps the paragraph reflowing normally.
 *
 * RTL: relies on the parent screen being mounted under I18nManager.forceRTL(true)
 * for Arabic, which flips the flex direction. No manual row-reverse.
 *
 * THEME: the auth subtree follows the adaptive theme (see src/features/auth/index.ts).
 */
export default function OnboardingFooter(): React.JSX.Element {
  const { t } = useTranslation();
  const palette = useAuthPalette();

  // No-op handlers until the Terms / Privacy routes exist.
  const onTerms = useCallback(() => {
    // TODO: navigate to Terms and Conditions screen.
  }, []);
  const onPrivacy = useCallback(() => {
    // TODO: navigate to Privacy Policy screen.
  }, []);

  // Both inline links are identical — declared once at module scope so the object
  // identity is stable across renders.
  const linkStyle = {
    ...AUTH_TYPE.caption,
    color: palette.onSurface,
    textDecorationLine: 'underline',
  } as const;

  return (
    <View style={{ alignItems: 'center' }}>
      <AppText style={{ ...AUTH_TYPE.caption, color: palette.onSurface, textAlign: 'center' }}>
        {t('auth.onboarding.legal.prefix')}{' '}
        <AppText style={linkStyle} accessibilityRole="link" onPress={onTerms}>
          {t('auth.onboarding.legal.terms')}
        </AppText>{' '}
        {t('auth.onboarding.legal.and')}{' '}
        <AppText style={linkStyle} accessibilityRole="link" onPress={onPrivacy}>
          {t('auth.onboarding.legal.privacy')}
        </AppText>
      </AppText>
    </View>
  );
}
