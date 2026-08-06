import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/*
 * API base URL — runtime-overridable.
 *
 * The backend can be reached on different addresses depending on how the app
 * is being run (iOS sim, Android emulator, physical device on the same Wi-Fi
 * as the dev machine, Expo Go, a tunnel like ngrok). Hardcoding one URL in
 * `.env` forces a Metro restart every time the URL changes — painful during
 * development when the LAN IP shifts between networks.
 *
 * Resolution order at request time:
 *   1. The value the user typed into the Server Settings screen and that
 *      `loadApiBaseUrlOverride()` pulled from AsyncStorage at boot.
 *   2. `EXPO_PUBLIC_API_BASE_URL` from `.env` — set once at install time.
 *   3. A platform-aware default: `10.0.2.2` on Android emulator (the loopback
 *      alias to the host machine), `localhost` everywhere else. This matches
 *      the comments in `.env.example` so the developer experience is the
 *      same whether or not the env var is set.
 *
 * The override is a module-level variable so `apiUrl(path)` stays synchronous
 * — every API call would otherwise have to await an AsyncStorage read.
 */

const API_BASE_URL_KEY = 'oneai.api.baseUrl';

const DEFAULT_API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:4000/api/v1' : 'http://localhost:4000/api/v1';

let cachedOverride: string | null = null;

function isValidBaseUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Permissive: anything http(s)://host[:port][/path] is accepted. We do not
  // try to be cleverer than that — the user pastes what their backend prints.
  return /^https?:\/\/\S+/i.test(trimmed);
}

/** Normalise: trim trailing slash so callers can always append `/path`. */
function normalize(value: string): string {
  return value.trim().replace(/\/$/, '');
}

/**
 * Pull the persisted override from AsyncStorage and cache it for `apiUrl`.
 * Safe to call multiple times — only the first call hits storage.
 *
 * Returns the resolved value (override or default) so `useAppBootstrap` can
 * surface it without re-deriving.
 */
export async function loadApiBaseUrlOverride(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(API_BASE_URL_KEY);
    cachedOverride = isValidBaseUrl(stored) ? normalize(stored) : null;
  } catch {
    // AsyncStorage read failed — fall back to the env/default path. Don't
    // block boot over a settings read; the user can re-enter the URL.
    cachedOverride = null;
  }
  return resolveApiBaseUrl();
}

/** Synchronous resolver used by `apiUrl()` on every request. */
export function resolveApiBaseUrl(): string {
  if (cachedOverride) return cachedOverride;
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (isValidBaseUrl(fromEnv)) return normalize(fromEnv);
  return DEFAULT_API_BASE_URL;
}

/** Persist the override to AsyncStorage. */
export async function persistApiBaseUrlOverride(value: string | null): Promise<void> {
  if (value && isValidBaseUrl(value)) {
    await AsyncStorage.setItem(API_BASE_URL_KEY, normalize(value));
    cachedOverride = normalize(value);
  } else {
    await AsyncStorage.removeItem(API_BASE_URL_KEY);
    cachedOverride = null;
  }
}

export { DEFAULT_API_BASE_URL };
