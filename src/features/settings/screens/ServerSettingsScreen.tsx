import React, { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';

import AppButton from '@/shared/ui/AppButton';
import { AppText } from '@/shared/ui/AppText';
import ScreenHeader from '@/shared/ui/ScreenHeader';
import TextField from '@/shared/ui/TextField';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { apiRequest, ApiError } from '@/shared/api/client';
import {
  DEFAULT_API_BASE_URL,
  persistApiBaseUrlOverride,
  resolveApiBaseUrl,
} from '@/shared/api/baseUrl';

/*
 * Server Settings — dev-tool screen for changing the API base URL at runtime.
 *
 * The mobile app normally reads `EXPO_PUBLIC_API_BASE_URL` from `.env` at build
 * time, but that forces a Metro restart every time the LAN IP changes. The
 * server-settings screen lets the user paste a new URL (e.g. the new LAN IP
 * printed by the backend's "Server listening at" logs) and try it without
 * touching `.env` or restarting Metro.
 *
 * Reach:
 *   - from /login (small "Server settings" link in the footer) — useful when
 *     the request actually fails before the user can sign in.
 *   - from /profile (settings → Server settings) — useful when a previously
 *     good URL stops working.
 *
 * "Test connection" hits `GET /health` (or whatever the server exposes at the
 * root) — the simplest way to surface a wrong URL without depending on the
 * auth flow. Test PERSISTS the draft so a successful test leaves the device
 * pointed at the working URL even without tapping Save; Save is the explicit
 * commit, used on its own when the user only wants to record a URL.
 */
const CONTENT_WIDTH = 371;
const FIELD_GAP = 12;
const SECTION_GAP = 24;

async function pingBackend(): Promise<void> {
  await apiRequest<unknown>('/health', { method: 'GET', authenticated: false, timeoutMs: 5_000 })
    .catch((error: unknown) => {
      if (error instanceof ApiError) {
        throw new Error(`HTTP ${error.status}: ${error.message}`);
      }
      throw error instanceof Error ? error : new Error('Unknown error');
    });
}

export default function ServerSettingsScreen(): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();

  // The boot task (`loadApiBaseUrlOverride`) populates the module cache before
  // any route mounts, so the initial value reflects the persisted URL.
  const [draft, setDraft] = useState<string>(resolveApiBaseUrl());
  const [resolved, setResolved] = useState<string>(resolveApiBaseUrl());
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const applyDraft = useCallback(async (candidate: string): Promise<string> => {
    await persistApiBaseUrlOverride(candidate || null);
    const next = resolveApiBaseUrl();
    setResolved(next);
    return next;
  }, []);

  const onChangeDraft = useCallback((next: string) => {
    setDraft(next);
  }, []);

  const onReset = useCallback(() => {
    setDraft(DEFAULT_API_BASE_URL);
  }, []);

  const onSave = useCallback(async () => {
    setSaving(true);
    try {
      await applyDraft(draft.trim());
      Alert.alert(t('settings.serverSettings.savedTitle'), t('settings.serverSettings.savedMessage'));
    } finally {
      setSaving(false);
    }
  }, [applyDraft, draft, t]);

  const onTest = useCallback(async () => {
    setTesting(true);
    try {
      await applyDraft(draft.trim());
      await pingBackend();
      Alert.alert(
        t('settings.serverSettings.testOkTitle'),
        t('settings.serverSettings.testOkMessage', { url: resolveApiBaseUrl() }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(t('settings.serverSettings.testFailTitle'), message);
    } finally {
      setTesting(false);
    }
  }, [applyDraft, draft, t]);

  const onClear = useCallback(async () => {
    setDraft('');
    await applyDraft('');
  }, [applyDraft]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <ScreenHeader title={t('settings.serverSettings.title')} />

      <View
        style={{
          alignItems: 'center',
          paddingTop: theme.space.xl,
          paddingHorizontal: theme.space.lg,
        }}
      >
        <View style={{ width: '100%', maxWidth: CONTENT_WIDTH, gap: SECTION_GAP }}>
          <AppText style={{ ...theme.type.body, color: theme.color.textSecondary }}>
            {t('settings.serverSettings.description')}
          </AppText>

          <View style={{ gap: FIELD_GAP }}>
            <TextField
              label={t('settings.serverSettings.urlLabel')}
              value={draft}
              onChangeText={onChangeDraft}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder="http://10.10.28.85:4000/api/v1"
              testID="server-settings-url"
            />
            <View style={{ flexDirection: 'row', gap: theme.space.sm }}>
              <AppButton
                label={t('settings.serverSettings.test')}
                onPress={onTest}
                loading={testing}
                fill
                testID="server-settings-test"
              />
              <AppButton
                label={t('settings.serverSettings.save')}
                onPress={onSave}
                loading={saving}
                variant="surface"
                fill
                testID="server-settings-save"
              />
            </View>
            <View style={{ flexDirection: 'row', gap: theme.space.sm }}>
              <AppButton
                label={t('settings.serverSettings.reset')}
                onPress={onReset}
                variant="ghost"
                fill
                testID="server-settings-reset"
              />
              <AppButton
                label={t('settings.serverSettings.clear')}
                onPress={onClear}
                variant="ghost"
                fill
                testID="server-settings-clear"
              />
            </View>
          </View>

          <View
            style={{
              padding: theme.space.lg,
              borderRadius: theme.radius.lg,
              backgroundColor: theme.color.surface,
              gap: theme.space.xs,
            }}
            testID="server-settings-resolved"
          >
            <AppText
              style={{
                ...theme.type.tag,
                color: theme.color.textSecondary,
                textTransform: 'uppercase',
              }}
            >
              {t('settings.serverSettings.currentLabel')}
            </AppText>
            <AppText
              style={{ ...theme.type.body, color: theme.color.textPrimary }}
              selectable
              testID="server-settings-current"
            >
              {resolved}
            </AppText>
            <AppText style={{ ...theme.type.caption, color: theme.color.textSecondary }}>
              {t('settings.serverSettings.defaultLabel', { defaultUrl: DEFAULT_API_BASE_URL })}
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );
}
