import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthBackdrop from '../components/AuthBackdrop';
import AuthButton from '../components/AuthButton';
import AuthFlowGate from '../components/AuthFlowGate';
import AuthTextField from '../components/AuthTextField';
import LanguageToggle from '../components/LanguageToggle';
import { createRegistrationAccount } from '../api/registration';
import { useAuthFlowStore } from '../store/authFlowStore';
import { MIN_PASSWORD_LENGTH } from './NewPasswordScreen';

import { useAuthPalette } from '../palette';
import { AUTH_TYPE } from '../constants';

import { useTranslation } from '@/shared/i18n/useTranslation';
import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import { AppText } from '@/shared/ui/AppText';

/*
 * "Finish signing up" (Figma node 135:1175) — the last step of sign-up, reached
 * from the verify-email screen once the OTP is accepted on a SIGN-UP flow.
 *
 * Figma rhythm (370-wide centred container, node 135:1183):
 *   header (title 25/30 --16--> subtitle 16/24, width 298)
 *   --44--> [ (Full name --16--> email --16--> Password) --24--> Create Account ]
 * Same ramp as every other auth form, so nothing new was built — the fields are
 * the shared AuthTextField and the CTA the shared AuthButton.
 *
 * THE EMAIL FIELD IS READ-ONLY. The design shows it filled, and it has to be:
 * this address is the one the code was just sent to, so letting it be edited
 * here would mean the account is created for an address nobody verified. It is
 * rendered rather than hidden because a form that silently decides part of its
 * own payload is worse than one that shows it.
 *
 * CREATE ACCOUNT sends the verified email, name, password, and one-time proof
 * to the backend. Success clears the flow and REPLACES the route with chat home,
 * so Android Back cannot walk into a completed auth stack.
 *
 * THEME: the auth subtree follows the adaptive theme (see src/features/auth/index.ts).
 */
const SCREEN_PADDING = 16;
const TOGGLE_TOP = 12;
const HEADER_TO_FORM_GAP = 44;
const HEADER_GAP = 16; // title → subtitle
const FIELD_GAP = 16; // between fields
const FORM_GAP = 24; // field group → Create Account
const HEADER_MAX_WIDTH = 298;

export default function SignupScreen(): React.JSX.Element {
  return (
    <AuthFlowGate>
      <SignupContent />
    </AuthFlowGate>
  );
}

function SignupContent(): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const palette = useAuthPalette();

  // Non-null inside AuthFlowGate — the gate redirects when there is no flow.
  const email = useAuthFlowStore(state => state.email);
  const verificationToken = useAuthFlowStore(state => state.verificationToken);
  const clearFlow = useAuthFlowStore(state => state.clearFlow);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [submissionError, setSubmissionError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const onCreate = useCallback(async () => {
    if (submitting) return;

    if (!name.trim()) {
      setNameError(t('auth.signup.nameRequired'));
      return;
    }
    setNameError(undefined);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('auth.newPassword.tooShort', { count: MIN_PASSWORD_LENGTH }));
      return;
    }
    setError(undefined);

    if (!email || !verificationToken) {
      setSubmissionError(t('auth.signup.verifyAgain'));
      return;
    }
    setSubmitting(true);
    try {
      await createRegistrationAccount({
        email,
        name: name.trim(),
        password,
        verificationToken,
      });
      clearFlow();
      router.replace('/home');
    } catch {
      setSubmissionError(t('auth.signup.createError'));
    } finally {
      setSubmitting(false);
    }
  }, [submitting, name, password, email, verificationToken, t, clearFlow, router]);

  // Clear each field's error as soon as the user starts correcting it.
  const onChangeName = useCallback(
    (next: string) => {
      setName(next);
      if (nameError) setNameError(undefined);
      if (submissionError) setSubmissionError(undefined);
    },
    [nameError, submissionError],
  );
  const onChangePassword = useCallback(
    (next: string) => {
      setPassword(next);
      if (error) setError(undefined);
      if (submissionError) setSubmissionError(undefined);
    },
    [error, submissionError],
  );

  if (!verificationToken) {
    return <Redirect href="/verify-email" />;
  }

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
            <View style={{ gap: HEADER_TO_FORM_GAP }}>
              {/* Header */}
              <View style={{ gap: HEADER_GAP, alignSelf: 'center', maxWidth: HEADER_MAX_WIDTH }}>
                <AppText style={{ ...AUTH_TYPE.h4, color: palette.onSurface, textAlign: 'center' }}>
                  {t('auth.signup.title')}
                </AppText>
                <AppText style={{ ...AUTH_TYPE.body, color: palette.edge, textAlign: 'center' }}>
                  {t('auth.signup.subtitle')}
                </AppText>
              </View>

              {/* Form */}
              <View style={{ gap: FORM_GAP }}>
                <View style={{ gap: FIELD_GAP }}>
                  <AuthTextField
                    value={name}
                    onChangeText={onChangeName}
                    error={nameError}
                    placeholder={t('auth.signup.namePlaceholder')}
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="next"
                    testID="signup-name-input"
                  />
                  <AuthTextField
                    value={email ?? ''}
                    // Verified address — see the header. Not disabled-looking by
                    // accident: `editable={false}` is what makes it read-only,
                    // and the dimmed text is the design's own treatment.
                    editable={false}
                    accessibilityLabel={t('auth.signup.emailLabel')}
                    testID="signup-email-input"
                  />
                  <AuthTextField
                    value={password}
                    onChangeText={onChangePassword}
                    secureToggle
                    error={error}
                    placeholder={t('auth.signup.passwordPlaceholder')}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="go"
                    onSubmitEditing={onCreate}
                    testID="signup-password-input"
                  />
                </View>

                {submissionError ? (
                  <AppText
                    accessibilityRole={'alert'}
                    style={{ ...AUTH_TYPE.caption, color: palette.danger, textAlign: 'center' }}
                  >
                    {submissionError}
                  </AppText>
                ) : null}
                <AuthButton
                  variant="inverse"
                  label={t('auth.signup.submit')}
                  onPress={onCreate}
                  loading={submitting}
                  testID="signup-submit"
                />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoider>
    </View>
  );
}
