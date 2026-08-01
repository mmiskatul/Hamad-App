import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthBackdrop from '../components/AuthBackdrop';
import AuthButton from '../components/AuthButton';
import AuthFlowGate from '../components/AuthFlowGate';
import AuthTextField from '../components/AuthTextField';
import LanguageToggle from '../components/LanguageToggle';
import { resetPassword } from '../api/passwordReset';
import { useAuthFlowStore } from '../store/authFlowStore';

import { useAuthPalette } from '../palette';
import { AUTH_TYPE } from '../constants';

import { useTranslation } from '@/shared/i18n/useTranslation';
import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import { AppText } from '@/shared/ui/AppText';

/*
 * New password screen (Figma node 135:2125) — the last step of a PASSWORD RESET,
 * reached from the verify-email screen once a reset code is accepted.
 *
 * It used to double as the end of sign-up. It no longer does: sign-up finishes on
 * "Finish signing up" (SignupScreen, Figma 135:1175), which also collects a name.
 * The two were never the same screen in the design — they were only wired that
 * way because the sign-up screen had not been built yet.
 *
 * Figma rhythm (370-wide centred container, node 135:2133):
 *   header (title 25/30 --16--> subtitle 16/24, width 298)
 *   --44--> [ (New Password --16--> Confirm Password) --24--> Done ]
 * Fields are the shared AuthTextField — the design's field IS that component, so
 * nothing new was built.
 *
 * DONE clears the flow and REPLACES the route with /login, so the reset ends by
 * signing in with the new password. Replace, not push: the reset is finished, so
 * Back must not walk into a spent OTP screen. It does NOT touch the account list
 * — a reset changes an account that already exists.
 *
 * THEME: the auth subtree follows the adaptive theme (see src/features/auth/index.ts).
 */
const SCREEN_PADDING = 16;
const TOGGLE_TOP = 12;
const HEADER_TO_FORM_GAP = 44;
const HEADER_GAP = 16; // title → subtitle
const FIELD_GAP = 16; // new password → confirm password
const FORM_GAP = 24; // field group → Done
const HEADER_MAX_WIDTH = 298;

/* Minimum the client enforces before calling the server. */
export const MIN_PASSWORD_LENGTH = 8;

export default function NewPasswordScreen(): React.JSX.Element {
  return (
    <AuthFlowGate>
      <NewPasswordContent />
    </AuthFlowGate>
  );
}

function NewPasswordContent(): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const palette = useAuthPalette();

  // Non-null inside AuthFlowGate — the gate redirects when there is no flow.
  const email = useAuthFlowStore(state => state.email);
  const intent = useAuthFlowStore(state => state.intent);
  const resetToken = useAuthFlowStore(state => state.verificationToken);
  const clearFlow = useAuthFlowStore(state => state.clearFlow);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [submissionError, setSubmissionError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const onDone = useCallback(async () => {
    if (submitting) return;

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('auth.newPassword.tooShort', { count: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.newPassword.mismatch'));
      return;
    }
    setError(undefined);
    setSubmissionError(undefined);

    if (!email || !resetToken) return;
    setSubmitting(true);
    try {
      await resetPassword({ email, password, resetToken });
      clearFlow();
      router.replace('/login');
    } catch {
      setSubmissionError(t('auth.newPassword.resetError'));
    } finally {
      setSubmitting(false);
    }
  }, [submitting, password, confirm, email, resetToken, clearFlow, router, t]);

  // Clear the error as soon as the user starts correcting either field.
  const onChangePassword = useCallback(
    (next: string) => {
      setPassword(next);
      if (error) setError(undefined);
      if (submissionError) setSubmissionError(undefined);
    },
    [error, submissionError],
  );
  const onChangeConfirm = useCallback(
    (next: string) => {
      setConfirm(next);
      if (error) setError(undefined);
      if (submissionError) setSubmissionError(undefined);
    },
    [error, submissionError],
  );

  if (intent !== 'reset') {
    return <Redirect href="/login" />;
  }
  if (!resetToken) {
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
                  {t('auth.newPassword.title')}
                </AppText>
                <AppText style={{ ...AUTH_TYPE.body, color: palette.edge, textAlign: 'center' }}>
                  {t('auth.newPassword.subtitle')}
                </AppText>
              </View>

              {/* Form */}
              <View style={{ gap: FORM_GAP }}>
                <View style={{ gap: FIELD_GAP }}>
                  <AuthTextField
                    value={password}
                    onChangeText={onChangePassword}
                    secureToggle
                    placeholder={t('auth.newPassword.placeholder')}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="next"
                    testID="new-password-input"
                  />
                  <AuthTextField
                    value={confirm}
                    onChangeText={onChangeConfirm}
                    secureToggle
                    // The error sits under the SECOND field: both rules
                    // (length, match) are only decidable once both are filled.
                    error={error}
                    placeholder={t('auth.newPassword.confirmPlaceholder')}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="go"
                    onSubmitEditing={onDone}
                    testID="confirm-password-input"
                  />
                </View>

                {submissionError ? (
                  <AppText
                    accessibilityRole="alert"
                    style={{ ...AUTH_TYPE.caption, color: palette.danger, textAlign: 'center' }}
                  >
                    {submissionError}
                  </AppText>
                ) : null}

                <AuthButton
                  variant="inverse"
                  label={t('auth.newPassword.submit')}
                  onPress={onDone}
                  loading={submitting}
                  testID="new-password-submit"
                />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoider>
    </View>
  );
}
