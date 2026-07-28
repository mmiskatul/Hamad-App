import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import ar from './ar.json';

/*
 * Minimal i18n bootstrap. Designed for the auth screens first; promoted to a full
 * shared/i18n setup (with locale persistence, fallback chains, etc.) in the rebuild
 * chunk that follows (FUTURE #2 in PROJECT_TRACKER).
 *
 * Boot flow:
 *   1. Detect device locale via expo-localization.
 *   2. Init i18next with en + ar resources, react-i18next plugin.
 *   3. Apply RTL: if the resolved language is ar, flip I18nManager.allowRTL + forceRTL.
 *      Reload via expo-updates so the layout actually re-mounts in RTL.
 *
 * Caveats:
 *   - `forceRTL` requires a reload to take effect on Android. We call Updates.reloadAsync()
 *     only on explicit user toggle (LanguageToggle), not at first boot, because the app is
 *     already mounted in the resolved direction by then.
 *   - Jest stubs expo-localization to return 'en' and expo-updates.reloadAsync is a mock
 *     (jest.setup.js).
 */

export const SUPPORTED_LANGUAGES = ['en', 'ar'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const RESOURCES = { en: { translation: en }, ar: { translation: ar } } as const;

/*
 * The user's explicit language choice, persisted across app launches.
 *
 * WHY THIS IS NON-OPTIONAL: switching to Arabic flips the writing direction, and
 * I18nManager.forceRTL only takes effect after a full reload (expo-updates). If
 * the choice is not stored, that reload re-runs initI18n, which falls back to the
 * DEVICE locale (English) — so the app comes back up in EN + LTR and the toggle
 * appears to "snap back". Persisting the pick and reading it FIRST on boot is
 * what makes the switch stick.
 */
const LANGUAGE_KEY = 'oneai.settings.language';

function isSupported(value: unknown): value is SupportedLanguage {
  return value === 'en' || value === 'ar';
}

async function loadStoredLanguage(): Promise<SupportedLanguage | null> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    return isSupported(stored) ? stored : null;
  } catch {
    // AsyncStorage read failure is non-fatal — fall back to device detection.
    return null;
  }
}

async function persistLanguage(lng: SupportedLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lng);
  } catch {
    // Best-effort: a failed write only means the choice may not survive a relaunch.
  }
}

function detectDeviceLanguage(): SupportedLanguage {
  try {
    const locales = Localization.getLocales?.() ?? [];
    const first = locales[0]?.languageCode;
    if (first === 'ar') return 'ar';
  } catch {
    // expo-localization can throw under unusual environments; fall through to default.
  }
  return 'en';
}

/*
 * Push the freshly imported JSON into the LIVE i18next instance and force mounted
 * screens to re-render with it.
 *
 * i18next reads resources once at init(); adding translation keys mid-session
 * therefore has no effect on a running app until a full reload — which is why new
 * keys render as their raw path (`auth.login.title`) after a fast-refresh. This
 * re-seeds every bundle (overwrite=true) so those keys resolve immediately.
 *
 * The changeLanguage(sameLang) is deliberate: react-i18next's default
 * `bindI18nStore` is empty, so addResourceBundle alone does NOT re-render
 * consumers. Emitting `languageChanged` (which changeLanguage does even when the
 * language is unchanged) is the supported nudge. No RTL flip happens — same lang.
 */
function refreshResources(): void {
  for (const lng of SUPPORTED_LANGUAGES) {
    i18n.addResourceBundle(lng, 'translation', RESOURCES[lng].translation, true, true);
  }
  i18n.changeLanguage(i18n.language).catch(() => {
    /* best-effort dev refresh — ignore if the re-emit fails */
  });
}

export async function initI18n(): Promise<typeof i18n> {
  // Guard on the persistent singleton, not a module-level flag: a module `let`
  // resets when fast-refresh re-evaluates this file, but i18n.isInitialized rides
  // on the i18next instance and stays true across refreshes.
  if (i18n.isInitialized) {
    refreshResources();
    return i18n;
  }

  // The stored choice wins over device detection — see LANGUAGE_KEY above.
  const lng = (await loadStoredLanguage()) ?? detectDeviceLanguage();

  await i18n.use(initReactI18next).init({
    resources: RESOURCES,
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false }, // RN already escapes
    compatibilityJSON: 'v4',
    returnNull: false,
  });

  // RTL setup at boot: only force if language is RTL. We don't reload here — the
  // app is just mounting, so the resolved direction takes effect on first render.
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(lng === 'ar');

  return i18n;
}

/*
 * Dev-only fast-refresh hook. When a JSON file is edited, Metro re-evaluates it
 * and this module (its importer). If i18next is already running (no full reload),
 * re-seed the live bundles here so added keys resolve without a manual reload.
 * At first boot i18n.isInitialized is false, so this is a no-op until init() runs.
 */
if (__DEV__ && i18n.isInitialized) {
  refreshResources();
}

/**
 * Switch the active language. Reloads via expo-updates so I18nManager.forceRTL takes
 * effect — call from a user gesture (button press), not from a render.
 */
export async function changeLanguage(lng: SupportedLanguage): Promise<void> {
  if (!SUPPORTED_LANGUAGES.includes(lng)) return;

  /*
   * READ THE DIRECTION BEFORE MUTATING IT. This comparison used to run AFTER
   * forceRTL(), by which point I18nManager.isRTL already reported the new
   * value, so `directionChanged` was always false and the reload never fired:
   * the strings swapped language instantly while the LAYOUT stayed LTR until
   * the app was killed by hand. Capturing first is the whole fix.
   */
  const wasRTL = I18nManager.isRTL;
  const nextRTL = lng === 'ar';

  // Persist BEFORE the reload — the reload re-runs initI18n, which must read this
  // back or the app relaunches in the device language and the toggle snaps back.
  await persistLanguage(lng);

  await i18n.changeLanguage(lng);
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(nextRTL);

  if (nextRTL === wasRTL) return;

  try {
    const Updates = await import('expo-updates');
    await Updates.reloadAsync();
  } catch {
    /*
     * expo-updates is unavailable in Expo Go's dev client and in tests. The
     * native flag IS set, so the direction applies on the next launch — a
     * manual reload, not a broken app. Swallowing beats crashing the toggle.
     */
  }
}

export default i18n;