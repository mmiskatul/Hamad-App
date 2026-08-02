import { apiRequest } from '@/shared/api/client';
import { readAuthSession, type AuthSession } from '@/shared/auth';

/**
 * Restore the encrypted session and validate it while the splash is visible.
 * `apiRequest` refreshes an expired access token once and persists the rotated
 * refresh token. Offline/server failures preserve the local session so a brief
 * outage cannot log the user out; a rejected refresh clears it in the client.
 */
export async function restoreAuthSession(): Promise<AuthSession | null> {
  const stored = await readAuthSession();
  if (!stored) return null;

  try {
    await apiRequest('/auth/me', { authenticated: true });
  } catch {
    // For an invalid refresh, apiRequest has already cleared Keychain. For a
    // network failure or backend 5xx, it deliberately retains the session.
  }

  return readAuthSession();
}
