import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import ScreenHeader from '@/shared/ui/ScreenHeader';

/*
 * Long-form document page — Terms of Use (Figma 140:1968) and Privacy Policy
 * (140:2027). Both frames contain ONLY the header and the title: the design has
 * no body copy for either, and legal text is not something to invent.
 *
 * So the body is an i18n key the screen renders when it exists, and an explicit
 * empty state when it does not. That is the honest rendering of the current
 * state — a blank scroll view under a title looks like a rendering bug, and
 * placeholder lorem in a legal document is worse than nothing.
 *
 * TODO(content): paste the real documents into settings.terms.body /
 * settings.privacy.body (EN + AR), or point this at a fetched URL if legal wants
 * to update them without shipping an app build.
 */
const CONTENT_WIDTH = 371;

export type LegalScreenProps = {
  title: string;
  /** Full document text; blank renders the empty state. */
  body: string;
  testID?: string;
};

export default function LegalScreen({ title, body, testID }: LegalScreenProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const hasBody = body.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }} testID={testID}>
      <ScreenHeader title={title} fallbackHref="/about" />

      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          paddingTop: theme.space.xl,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: theme.space.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: CONTENT_WIDTH }}>
          {hasBody ? (
            <AppText style={{ ...theme.type.body, color: theme.color.textPrimary }}>
              {body}
            </AppText>
          ) : (
            <AppText
              style={{
                ...theme.type.caption,
                color: theme.color.textSecondary,
                textAlign: 'center',
              }}
              testID="legal-empty"
            >
              {t('settings.legal.empty')}
            </AppText>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
