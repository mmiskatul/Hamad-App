import React from 'react';

import LegalScreen from './LegalScreen';

import { useTranslation } from '@/shared/i18n/useTranslation';

/* Privacy Policy (Figma 140:2027). Body copy is still missing — see LegalScreen. */
export default function PrivacyScreen(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <LegalScreen
      title={t('settings.privacy.title')}
      body={t('settings.privacy.body')}
      testID="privacy-screen"
    />
  );
}
