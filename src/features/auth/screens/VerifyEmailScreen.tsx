import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthBackdrop from '../components/AuthBackdrop';
import AuthButton from '../components/AuthButton';
import AuthFlowGate from '../components/AuthFlowGate';
import LanguageToggle from '../components/LanguageToggle';
import OtpInput from '../components/OtpInput';
import { useAuthFlowStore } from '../store/authFlowStore';

import { useAuthPalette } from '../palette';
import { AUTH_TYPE } from '../constants';

import { useTranslation } from '@/shared/i18n/useTranslation';
import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import { AppText } from '@/shared/ui/AppText';

/*
 * Verify-email / OTP screen (Figma node 135:1062). Reached from the login
 * screen's Continue when the email is NOT yet registered — the entry point of
 * sign-up.
 *
 * FLOW STATE: the email comes from the auth-flow store (Zustand + AsyncStorage),
 * NOT from a route param — see store/authFlowStore.ts. The default export is the
 * GATED screen; VerifyEmailContent may assume the email exists. The OTP code
 * itself is deliberately NOT in the store: it is a credential, and the store is
 * unencrypted disk.
 *
 * Figma rhythm (370-wide centred container): header (title --16--> subtitle)
 * --44--> [ (OTP --24--> Verify) --24--> resend line ].
 *
 * THEME: the auth subtree follows the adaptive theme (see src/features/auth/index.ts);
 * every fill / label colour comes from `useAuthPalette()`.
 */
const SCREEN_PADDING = 16;
const TOGGLE_TOP = 12;
const HEADER_TO_FORM_GAP = 44;
const HEADER_GAP = 16; // title → subtitle
const FORM_GAP = 24; // OTP+Verify group → resend line
const GROUP_GAP = 24; // OTP → Verify
const HEADER_MAX_WIDTH = 298;
const OTP_LENGTH = 4;

export default function VerifyEmailScreen(): React.JSX.Element {
  return (
    <AuthFlowGate>
      <VerifyEmailContent />
    </AuthFlowGate>
  );
}

function VerifyEmailContent(): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const palette = useAuthPalette();

  // Non-null inside AuthFlowGate — the gate redirects when there is no flow.
  const email = useAuthFlowStore(state => state.email);
  const intent = useAuthFlowStore(state => state.intent);

  const [code, setCode] = useState('');
  const complete = code.length === OTP_LENGTH;

  const onVerify = useCallback(() => {
    if (!complete || !email) return;
    // TODO(backend): verify { email, code } and only continue when the server
    // accepts it; on failure surface an error and clear the code. The flow is
    // NOT cleared here — the next screen still needs the email, and it is that
    // screen's submit that finishes the journey.
    //
    // ONE SCREEN, TWO EXITS (see authFlowStore's AuthIntent): a reset already
    // has an account and only needs a replacement password; a sign-up has no
    // account yet and must collect a name first.
    router.push(intent === 'reset' ? '/new-password' : '/signup');
  }, [complete, email, intent, router]);

  const onResend = useCallback(() => {
    if (!email) return;
    // TODO(backend): request a new OTP for `email` and start a resend cooldown.
  }, [email]);

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <AuthBackdrop />

      <KeyboardAvoider style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + TOGGLE_TOP,
            paddingBottom: insets.bottom + SCREEN_PADDING,
            paddingHorizontal: SCREEN_PADDING,
          }}
        >
          <View style={{ alignItems: 'flex-end' }}>
            <LanguageToggle />
          </View>

          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={{ gap: HEADER_TO_FORM_GAP, alignItems: 'center' }}>
              {/* Header */}
              <View style={{ gap: HEADER_GAP, maxWidth: HEADER_MAX_WIDTH }}>
                <AppText style={{ ...AUTH_TYPE.h4, color: palette.onSurface, textAlign: 'center' }}>
                  {t('auth.verifyEmail.title')}
                </AppText>
                <AppText style={{ ...AUTH_TYPE.body, color: palette.edge, textAlign: 'center' }}>
                  {t('auth.verifyEmail.subtitle')}
                </AppText>
              </View>

              {/* Form */}
              <View style={{ gap: FORM_GAP, alignItems: 'center', width: '100%' }}>
                <View style={{ gap: GROUP_GAP, alignItems: 'center', width: '100%' }}>
                  <OtpInput
                    value={code}
                    onChangeText={setCode}
                    length={OTP_LENGTH}
                    autoFocus
                    onComplete={onVerify}
                    accessibilityLabel={t('auth.verifyEmail.title')}
                  />
                  <AuthButton
                    variant="inverse"
                    label={t('auth.verifyEmail.verify')}
                    onPress={onVerify}
                    disabled={!complete}
                    testID="verify-submit"
                  />
                </View>

                {/* Resend line — "Resend code" is the accent-coloured action */}
                <AppText style={{ ...AUTH_TYPE.caption, color: palette.onSurface, textAlign: 'center' }}>
                  {t('auth.verifyEmail.resendPrefix')}{' '}
                  <AppText
                    accessibilityRole="link"
                    onPress={onResend}
                    style={{ ...AUTH_TYPE.caption, color: palette.accentFocus }}
                  >
                    {t('auth.verifyEmail.resend')}
                  </AppText>
                </AppText>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoider>
    </View>
  );
}
