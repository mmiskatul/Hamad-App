import React from 'react';

import LegalScreen from './LegalScreen';

import { useTranslation } from '@/shared/i18n/useTranslation';

/* Terms of Use (Figma 140:1968). Body copy is still missing — see LegalScreen. */
export default function TermsScreen(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <LegalScreen
      title={t('settings.terms.title')}
      body={t('settings.terms.body')}
      testID="terms-screen"
    />
  );
}
