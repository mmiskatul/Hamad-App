import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthButton from '../components/AuthButton';
import AuthDivider from '../components/AuthDivider';
import AuthTextField from '../components/AuthTextField';
import LanguageToggle from '../components/LanguageToggle';
import AuthBackdrop from '../components/AuthBackdrop';
import { useCheckEmail } from '../hooks/useCheckEmail';
import { useAuthFlowStore } from '../store/authFlowStore';

import { useAuthPalette } from '../palette';
import { AUTH_TYPE } from '../constants';

import { useTranslation } from '@/shared/i18n/useTranslation';
import FormScrollArea from '@/shared/ui/FormScrollArea';
import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import { AppText } from '@/shared/ui/AppText';

import GoogleG from '../../../../assets/auth/google-g.svg';
import AppleMark from '../../../../assets/auth/apple.svg';

/*
 * Login / sign-up screen (Figma node 135:992). Reached from the onboarding
 * screen's "Log in or sign up" CTA.
 *
 * LOADING CONTRACT: this screen waits on NOTHING async — its only images are the
 * pattern and the Google/Apple marks, all .svg (compiled into the bundle by
 * react-native-svg-transformer, nothing to preload), and i18n is bootstrapped
 * before any route mounts. So there is deliberately no ScreenGate/skeleton here:
 * the project rule gates screens that wait on assets or data, and this one does
 * not. If a network step is added later (e.g. an availability check), gate it
 * then, following OnboardingScreen's pattern.
 *
 * THEME: the auth subtree follows the adaptive theme (see src/features/auth/index.ts);
 * every fill / label colour comes from `useAuthPalette()` so the screen flips
 * with the user's light/dark preference.
 *
 * Figma rhythm (370-wide centred container, node 135:1061):
 *   header (title+subtitle, gap 16) --44--> form block (gap 32):
 *     [email field + Continue] gap 20 --> OR divider --> [Google + Apple] gap 20
 */
const SCREEN_PADDING = 16;
const TOGGLE_TOP = 12;
const HEADER_TO_FORM_GAP = 44; // Figma container gap
const HEADER_GAP = 16; // title → subtitle
const FORM_GAP = 32; // between form sub-groups
const GROUP_GAP = 20; // within a sub-group (field→button, google→apple)
const HEADER_MAX_WIDTH = 298;
const FOOTER_GAP = 24;

/* Pragmatic email check — non-empty and looks like an address. Server is the
   real authority; this only drives the inline error state. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const checkEmail = useCheckEmail();
  const startFlow = useAuthFlowStore(state => state.startFlow);
  const palette = useAuthPalette();

  /*
   * Prefilled from the persisted flow: if the user was mid-sign-in and closed
   * the app (or backed out of /password), the address they already typed is
   * still there. Lazy initialiser + getState(), not a subscription — this is a
   * SEED for an editable field, so later store writes must not yank what the
   * user is currently typing. Hydration has finished by now on the normal path
   * (useAppBootstrap awaits it before the splash hands off); a deep link
   * straight to /login can arrive first, in which case the field simply starts
   * empty, which is the correct fallback.
   */
  const [email, setEmail] = useState(() => useAuthFlowStore.getState().email ?? '');
  const [error, setError] = useState<string | undefined>(undefined);

  const onContinue = useCallback(async () => {
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError(t('auth.login.emailError'));
      return;
    }
    setError(undefined);
    // Ask the backend whether this email has an account, then branch:
    //   registered  → /password    (log in)
    //   new         → /verify-email (start sign-up with an OTP)
    // The result goes into the auth-flow store FIRST and the route carries no
    // params: the destination screens read email/registered from the store, which
    // is the single source of truth for the flow and survives an app restart.
    try {
      const { registered } = await checkEmail.mutateAsync(trimmed);
      startFlow({ email: trimmed, registered });
      router.push(registered ? '/password' : '/verify-email');
    } catch {
      setError(t('auth.login.checkError'));
    }
  }, [email, t, checkEmail, router, startFlow]);

  const onChangeEmail = useCallback(
    (next: string) => {
      setEmail(next);
      // Clear the error as soon as the user starts correcting it.
      if (error) setError(undefined);
    },
    [error],
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <AuthBackdrop />

      {/*
       * Keyboard avoidance: this is a form whose primary CTA sits just below the
       * email field, so on shorter devices the software keyboard would cover the
       * "Continue" button. iOS needs the explicit `padding` behavior; Android
       * resizes the window itself (adjustResize), so leaving behavior undefined
       * there avoids double-shifting.
       */}
      <KeyboardAvoider style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            paddingTop: insets.top + TOGGLE_TOP,
            paddingBottom: insets.bottom + SCREEN_PADDING,
            paddingHorizontal: SCREEN_PADDING,
          }}
        >
          {/* Top bar: language toggle on the trailing edge */}
          <View style={{ alignItems: 'flex-end' }}>
            <LanguageToggle />
          </View>

          {/*
          Centred form block. It SCROLLS rather than just shrinking: with the
          keyboard up there is not enough height for header + field + CTA +
          divider + two social buttons, and a plain flex:1 box lets that content
          overflow onto the legal footer below it (see FormScrollArea).
        */}
          <FormScrollArea>
            <View style={{ gap: HEADER_TO_FORM_GAP }}>
              {/* Header */}
              <View style={{ gap: HEADER_GAP, alignSelf: 'center', maxWidth: HEADER_MAX_WIDTH }}>
                <AppText style={{ ...AUTH_TYPE.h4, color: palette.onSurface, textAlign: 'center' }}>
                  {t('auth.login.title')}
                </AppText>
                <AppText style={{ ...AUTH_TYPE.body, color: palette.muted, textAlign: 'center' }}>
                  {t('auth.login.subtitle')}
                </AppText>
              </View>

              {/* Form */}
              <View style={{ gap: FORM_GAP }}>
                {/* Email + primary CTA */}
                <View style={{ gap: GROUP_GAP }}>
                  <AuthTextField
                    value={email}
                    onChangeText={onChangeEmail}
                    error={error}
                    placeholder={t('auth.login.emailPlaceholder')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={onContinue}
                    testID="login-email"
                  />
                  <AuthButton
                    variant="inverse"
                    label={t('auth.login.continue')}
                    onPress={onContinue}
                    loading={checkEmail.isPending}
                    testID="login-continue"
                  />
                </View>

                <AuthDivider label={t('auth.login.divider')} />

                {/* Social auth — outline pills */}
                <View style={{ gap: GROUP_GAP }}>
                  <AuthButton
                    variant="outline"
                    icon={<GoogleG width={24} height={24} />}
                    label={t('auth.login.cta.google')}
                    onPress={() => {
                      // TODO: wire to real Google OAuth flow when backend is ready.
                    }}
                  />
                  <AuthButton
                    variant="outline"
                    icon={<AppleMark width={24} height={24} />}
                    label={t('auth.login.cta.apple')}
                    onPress={() => {
                      // TODO: wire to real Apple OAuth flow when backend is ready.
                    }}
                  />
                </View>
              </View>
            </View>
          </FormScrollArea>

          {/* Footer: plain legal line (Figma 135:1010 — no underline, "-" separator) */}
          <View style={{ alignItems: 'center', marginTop: FOOTER_GAP }}>
            <AppText style={{ ...AUTH_TYPE.caption, color: palette.onSurface, textAlign: 'center' }}>
              {t('auth.login.legal.terms')} {t('auth.login.legal.separator')} {t('auth.login.legal.privacy')}
            </AppText>
          </View>
        </View>
      </KeyboardAvoider>
    </View>
  );
}
