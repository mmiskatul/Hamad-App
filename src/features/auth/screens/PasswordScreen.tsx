import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthBackButton from '../components/AuthBackButton';
import AuthBackdrop from '../components/AuthBackdrop';
import AuthButton from '../components/AuthButton';
import AuthFlowGate from '../components/AuthFlowGate';
import AuthTextField from '../components/AuthTextField';
import LanguageToggle from '../components/LanguageToggle';
import { loginWithPassword } from '../api/authentication';
import { requestPasswordResetCode } from '../api/passwordReset';
import { useAuthFlowStore } from '../store/authFlowStore';

import { useAuthPalette } from '../palette';
import { AUTH_TYPE } from '../constants';

import { useTranslation } from '@/shared/i18n/useTranslation';
import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import { AppText } from '@/shared/ui/AppText';

/*
 * Password screen (Figma node 135:1990). Reached from the login screen's
 * Continue when the email belongs to an EXISTING account.
 *
 * FLOW STATE: the email comes from the auth-flow store (Zustand + AsyncStorage),
 * NOT from a route param — see store/authFlowStore.ts for why. The default
 * export is therefore the GATED screen: AuthFlowGate waits for hydration and
 * redirects to /login when there is no flow, so PasswordContent below may assume
 * the email exists. Same shape as OnboardingScreen's ScreenGate pattern.
 *
 * Figma rhythm (370-wide centred container): title --44--> [ (field --12-->
 * forgot link) --24--> Login button ].
 *
 * The top bar carries AuthBackButton (leading) + LanguageToggle (trailing). The
 * back button POPS the stack (never pushes /login), so bouncing between login and
 * password cannot grow the stack — see AuthBackButton for the full rationale.
 *
 * THEME: the auth subtree follows the adaptive theme (see src/features/auth/index.ts);
 * every fill / label colour comes from `useAuthPalette()`.
 */
const SCREEN_PADDING = 16;
const TOGGLE_TOP = 12;
const HEADER_TO_FORM_GAP = 44;
const FIELD_TO_LINK_GAP = 12;
const FORM_GAP = 24; // field group → Login button
const HEADER_MAX_WIDTH = 298;

export default function PasswordScreen(): React.JSX.Element {
  return (
    <AuthFlowGate>
      <PasswordContent />
    </AuthFlowGate>
  );
}

function PasswordContent(): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const palette = useAuthPalette();

  // Non-null inside AuthFlowGate — the gate redirects when there is no flow.
  const email = useAuthFlowStore(state => state.email);
  const clearFlow = useAuthFlowStore(state => state.clearFlow);
  const startReset = useAuthFlowStore(state => state.startReset);

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [requestingReset, setRequestingReset] = useState(false);
  const [resetError, setResetError] = useState<string | undefined>(undefined);

  const onLogin = useCallback(async () => {
    if (!email || !password || submitting) return;
    setError(undefined);
    setResetError(undefined);
    setSubmitting(true);
    try {
      await loginWithPassword(email, password);
      clearFlow();
      router.replace('/home');
    } catch {
      setError(t('auth.password.loginError'));
    } finally {
      setSubmitting(false);
    }
  }, [email, password, submitting, clearFlow, router, t]);

  const onForgot = useCallback(async () => {
    if (!email || requestingReset) return;
    // Reset reuses the OTP screen, so the only thing to change is the intent —
    // the email is already in the flow, which is exactly why the reset journey
    // has no "enter your email" step of its own.
    setRequestingReset(true);
    setResetError(undefined);
    try {
      await requestPasswordResetCode(email);
      startReset();
      router.push('/verify-email');
    } catch {
      setResetError(t('auth.password.resetRequestError'));
    } finally {
      setRequestingReset(false);
    }
  }, [email, requestingReset, startReset, router, t]);

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
          {/*
           * Top bar: back on the leading edge, language toggle on the trailing
           * edge. `flexDirection: 'row'` flips wholesale under RTL, so no
           * left/right anywhere. The -8 start margin pulls the 40pt touch target
           * back so the 24pt glyph optically lines up with the screen padding.
           */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ marginStart: -8 }}>
              <AuthBackButton testID="password-back" />
            </View>
            <LanguageToggle />
          </View>

          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={{ gap: HEADER_TO_FORM_GAP }}>
              {/* Title */}
              <View style={{ alignSelf: 'center', maxWidth: HEADER_MAX_WIDTH }}>
                <AppText style={{ ...AUTH_TYPE.h4, color: palette.onSurface, textAlign: 'center' }}>
                  {t('auth.password.title')}
                </AppText>
              </View>

              {/* Form */}
              <View style={{ gap: FORM_GAP }}>
                <View style={{ gap: FIELD_TO_LINK_GAP }}>
                  <AuthTextField
                    value={password}
                    onChangeText={next => {
                      setPassword(next);
                      if (error) setError(undefined);
                    }}
                    error={error}
                    secureToggle
                    placeholder={t('auth.password.placeholder')}
                    autoCapitalize="none"
                    autoComplete="password"
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={onLogin}
                    testID="password-input"
                  />
                  {/* Forgot link — start-aligned caption (flips under RTL) */}
                  <View style={{ alignItems: 'flex-start' }}>
                    <Pressable
                      onPress={onForgot}
                      accessibilityRole="link"
                      accessibilityState={{ busy: requestingReset, disabled: requestingReset }}
                      disabled={requestingReset}
                      hitSlop={6}
                      testID="forgot-password"
                    >
                      <AppText style={{ ...AUTH_TYPE.caption, color: palette.onSurface }}>
                        {requestingReset
                          ? t('auth.password.sendingResetCode')
                          : t('auth.password.forgot')}
                      </AppText>
                    </Pressable>
                  </View>
                  {resetError ? (
                    <AppText
                      accessibilityRole="alert"
                      style={{ ...AUTH_TYPE.caption, color: palette.danger }}
                    >
                      {resetError}
                    </AppText>
                  ) : null}
                </View>

                <AuthButton
                  variant="inverse"
                  label={t('auth.password.submit')}
                  onPress={onLogin}
                  loading={submitting}
                  testID="password-submit"
                />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoider>
    </View>
  );
}
