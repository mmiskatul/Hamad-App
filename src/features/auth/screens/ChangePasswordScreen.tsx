import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AuthBackButton from '../components/AuthBackButton';
import AuthBackdrop from '../components/AuthBackdrop';
import AuthButton from '../components/AuthButton';
import AuthTextField from '../components/AuthTextField';
import LanguageToggle from '../components/LanguageToggle';
import { MIN_PASSWORD_LENGTH } from './NewPasswordScreen';

import { useAuthPalette } from '../palette';
import { AUTH_TYPE } from '../constants';

import { useTranslation } from '@/shared/i18n/useTranslation';
import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import { AppText } from '@/shared/ui/AppText';
import { changePassword } from '../api/changePassword';
import { ApiError } from '@/shared/api/client';

/*
 * Change password (Figma node 140:1935), opened from the profile's Password row.
 *
 * IT IS AN AUTH SCREEN REACHED FROM THE APP: the design puts this frame in the
 * Auth section, so it is built in the auth feature under the ADAPTIVE palette
 * contract — it now follows the user's light/dark preference like every other
 * auth screen. Only its ROUTE lives in (app), because that is where it is
 * entered from.
 *
 * Figma rhythm (370-wide centred container, node 140:1942 — note it is offset 79
 * above centre to leave room for three fields):
 *   header (title 25/30 --16--> subtitle 16/24, width 298)
 *   --44--> [ (Current --16--> New --16--> Confirm) --24--> Done ]
 *
 * THE ✕ IS THE ONE ADDITION TO THE DESIGN (user request): this is the only auth
 * screen the user opts into rather than being routed through, so it needs a way
 * out that does not commit to anything. It sits on the LEADING edge and reuses
 * AuthBackButton's `close` variant — same pop-never-push navigation contract.
 *
 * THREE FIELDS, THREE RULES, and the current password is not optional: without
 * it, anyone holding an unlocked phone could change the account's password. The
 * check itself is server-side (TODO below) — this screen only refuses to submit
 * an obviously bad form.
 */
const SCREEN_PADDING = 16;
const TOGGLE_TOP = 12;
const HEADER_TO_FORM_GAP = 44;
const HEADER_GAP = 16; // title → subtitle
const FIELD_GAP = 16; // between fields
const FORM_GAP = 24; // field group → Done
const HEADER_MAX_WIDTH = 298;

export default function ChangePasswordScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const palette = useAuthPalette();

  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [currentError, setCurrentError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const onDone = useCallback(async () => {
    if (submitting) return;

    if (!current) {
      setCurrentError(t('auth.changePassword.currentRequired'));
      return;
    }
    setCurrentError(undefined);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('auth.newPassword.tooShort', { count: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.newPassword.mismatch'));
      return;
    }
    // A "new" password identical to the current one is a no-op the user will
    // read as success — refuse it here rather than let the server shrug.
    if (password === current) {
      setError(t('auth.changePassword.sameAsCurrent'));
      return;
    }
    setError(undefined);

    setSubmitting(true);
    try {
      await changePassword(current, password);
      router.back();
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.code === 'CURRENT_PASSWORD_INCORRECT') {
        setCurrentError(t('auth.changePassword.currentIncorrect'));
      } else {
        setError(t('auth.changePassword.failed'));
      }
    } finally {
      setSubmitting(false);
    }
  }, [submitting, current, password, confirm, t, router]);

  // Each field clears its own error as soon as the user starts correcting it.
  const onChangeCurrent = useCallback(
    (next: string) => {
      setCurrent(next);
      if (currentError) setCurrentError(undefined);
    },
    [currentError],
  );
  const onChangePassword = useCallback(
    (next: string) => {
      setPassword(next);
      if (error) setError(undefined);
    },
    [error],
  );
  const onChangeConfirm = useCallback(
    (next: string) => {
      setConfirm(next);
      if (error) setError(undefined);
    },
    [error],
  );

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
           * Top bar: ✕ on the leading edge, language toggle on the trailing one.
           * `flexDirection: 'row'` flips wholesale under RTL, so there is no
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
              <AuthBackButton variant="close" fallbackHref="/profile" testID="change-password-close" />
            </View>
            <LanguageToggle />
          </View>

          <View style={{ flex: 1, justifyContent: 'center' }}>
            <View style={{ gap: HEADER_TO_FORM_GAP }}>
              {/* Header */}
              <View style={{ gap: HEADER_GAP, alignSelf: 'center', maxWidth: HEADER_MAX_WIDTH }}>
                <AppText style={{ ...AUTH_TYPE.h4, color: palette.onSurface, textAlign: 'center' }}>
                  {t('auth.changePassword.title')}
                </AppText>
                <AppText style={{ ...AUTH_TYPE.body, color: palette.edge, textAlign: 'center' }}>
                  {t('auth.changePassword.subtitle')}
                </AppText>
              </View>

              {/* Form */}
              <View style={{ gap: FORM_GAP }}>
                <View style={{ gap: FIELD_GAP }}>
                  <AuthTextField
                    value={current}
                    onChangeText={onChangeCurrent}
                    secureToggle
                    error={currentError}
                    placeholder={t('auth.changePassword.currentPlaceholder')}
                    autoCapitalize="none"
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="next"
                    testID="current-password-input"
                  />
                  <AuthTextField
                    value={password}
                    onChangeText={onChangePassword}
                    secureToggle
                    placeholder={t('auth.newPassword.placeholder')}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="next"
                    testID="change-new-password-input"
                  />
                  <AuthTextField
                    value={confirm}
                    onChangeText={onChangeConfirm}
                    secureToggle
                    // The error sits under the LAST field: length, match and
                    // same-as-current are only decidable once all three are in.
                    error={error}
                    placeholder={t('auth.newPassword.confirmPlaceholder')}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="go"
                    onSubmitEditing={onDone}
                    testID="change-confirm-password-input"
                  />
                </View>

                <AuthButton
                  variant="inverse"
                  label={t('auth.newPassword.submit')}
                  onPress={onDone}
                  loading={submitting}
                  testID="change-password-submit"
                />
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoider>
    </View>
  );
}
