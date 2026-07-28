import AsyncStorage from '@react-native-async-storage/async-storage';

/*
 * Local stand-in for the accounts table, until backend/src/modules/auth exists.
 *
 * RULE (user, 2026-07-21): an email that is NOT in local storage is a NEW
 * account → the verification (OTP) screen; an email that IS in local storage is
 * an existing account → the password screen. Completing sign-up (New password →
 * Done) is what writes the email in, so the second run of the same address takes
 * the password branch.
 *
 * This REPLACES the previous stub rule ("local part contains 'new' ⇒
 * unregistered"), which could not be driven by the user's own actions.
 *
 * Stores EMAILS ONLY — never a password. This is unencrypted AsyncStorage; real
 * credentials belong to the backend, with tokens in react-native-keychain
 * (tracker FUTURE #8).
 *
 * TODO(backend): delete this file. `checkEmailRegistered` calls the real
 * endpoint, and account creation happens server-side.
 */
export const ACCOUNTS_STORAGE_KEY = 'oneai.auth.accounts';

/** Emails are matched case-insensitively and trimmed, as a server would. */
function normalise(email: string): string {
  return email.trim().toLowerCase();
}

async function readAll(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    // Defensive: a corrupted/hand-edited value must read as "no accounts"
    // rather than throwing inside the login screen's mutation.
    return Array.isArray(parsed) ? parsed.filter((e): e is string => typeof e === 'string') : [];
  } catch {
    return [];
  }
}

export async function isEmailRegistered(email: string): Promise<boolean> {
  const accounts = await readAll();
  return accounts.includes(normalise(email));
}

/** Idempotent: registering an existing email is a no-op, not a duplicate row. */
export async function registerAccount(email: string): Promise<void> {
  const normalised = normalise(email);
  const accounts = await readAll();
  if (accounts.includes(normalised)) return;
  await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([...accounts, normalised]));
}

/** Test/QA helper — wipes the local account list. */
export async function clearAccounts(): Promise<void> {
  await AsyncStorage.removeItem(ACCOUNTS_STORAGE_KEY);
}
