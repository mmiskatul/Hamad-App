import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera01Icon } from '@hugeicons/core-free-icons';

import ProfileAvatar from '../components/ProfileAvatar';

import { updateProfile, useProfileStore } from '@/shared/profile';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import KeyboardAvoider from '@/shared/ui/KeyboardAvoider';
import AppButton from '@/shared/ui/AppButton';
import TextField from '@/shared/ui/TextField';
import ScreenHeader from '@/shared/ui/ScreenHeader';
import { AppText } from '@/shared/ui/AppText';

/*
 * Edit profile (Figma 142:877): title header, 92pt avatar with a CAMERA badge,
 * notched NAME and EMAIL fields, then a Cancel / Save pair.
 *
 * The form is LOCAL state seeded from the store, not the store itself: Cancel
 * has to be able to throw the edit away, which is impossible if every keystroke
 * has already written through. Save is the only commit point.
 *
 * Save is disabled until something actually changed AND the name is non-empty —
 * a "Save" that writes an identical record, or blanks the user's name, is a
 * button that does damage for no reason.
 */
const CONTENT_WIDTH = 370;

export default function EditProfileScreen(): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const profileName = useProfileStore((state) => state.name);
  const profileEmail = useProfileStore((state) => state.email);
  const profilePhone = useProfileStore((state) => state.phone);
  const saveProfile = useProfileStore((state) => state.saveProfile);

  const [name, setName] = useState(profileName);
  const [email, setEmail] = useState(profileEmail);
  const [phone, setPhone] = useState(profilePhone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    name !== profileName || email !== profileEmail || phone !== profilePhone;
  const valid =
    name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    phone.trim().length <= 30;

  const onCancel = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/profile');
  }, [router]);

  const onSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      saveProfile(updated);
      onCancel();
    } catch {
      setError(t('settings.profile.saveError'));
    } finally {
      setSaving(false);
    }
  }, [saveProfile, name, email, phone, onCancel, t]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <ScreenHeader title={t('settings.profile.title')} fallbackHref="/profile" />

      <KeyboardAvoider style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ alignItems: 'center', paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ProfileAvatar
            badgeIcon={Camera01Icon}
            badgeLabel={t('settings.profile.changePhoto')}
            onPressBadge={() => {
              // TODO: expo-image-picker + the avatar upload endpoint. Deliberately
              // inert rather than opening a picker that has nowhere to upload to.
            }}
          />

          <View
            style={{
              width: '100%',
              maxWidth: CONTENT_WIDTH,
              paddingTop: 32,
              paddingHorizontal: theme.space.lg,
              gap: 32,
            }}
          >
            <View style={{ gap: theme.space.xl }}>
              <TextField
                label={t('settings.profile.name')}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                testID="profile-name"
              />
              <TextField
                label={t('settings.profile.email')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                testID="profile-email"
              />
              <TextField
                label={t('settings.profile.phone')}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCorrect={false}
                testID="profile-phone"
              />
            </View>

            {error ? (
              <AppText
                testID="profile-save-error"
                style={{ ...theme.type.caption, color: theme.color.danger }}
              >
                {error}
              </AppText>
            ) : null}

            <View style={{ flexDirection: 'row', gap: theme.space.lg }}>
              <AppButton
                label={t('common.cancel')}
                variant="ghost"
                fill
                onPress={onCancel}
                testID="profile-cancel"
              />
              <AppButton
                label={t('common.save')}
                fill
                disabled={!dirty || !valid}
                loading={saving}
                onPress={onSave}
                testID="profile-save"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoider>
    </View>
  );
}
