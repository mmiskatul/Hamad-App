import {
  ApiError,
  apiRequest,
  refreshCurrentAuthSession,
} from '@/shared/api/client';
import {
  invalidateAuthSession,
  readAuthSession,
  type AuthSession,
} from '@/shared/auth';

/**
 * Restore the encrypted session, force refresh-token rotation, then validate
 * the new access token before any authenticated screen can render.
 */
let restorePromise: Promise<AuthSession | null> | null = null;
let validatedRefreshToken: string | null = null;

export async function restoreAuthSession(): Promise<AuthSession | null> {
  const stored = await readAuthSession();
  if (!stored) return null;
  if (stored.refreshToken === validatedRefreshToken) return stored;
  if (restorePromise) return restorePromise;

  restorePromise = (async () => {
    try {
      const refreshed = await refreshCurrentAuthSession();
      await apiRequest('/auth/me', {
        authenticated: true,
        retryOnUnauthorized: false,
      });
      validatedRefreshToken = refreshed.refreshToken;
      return refreshed;
    } catch (error) {
      // A definitive authentication rejection clears secure storage and
      // broadcasts logout. Network/5xx failures still fail this boot closed,
      // but preserve credentials so the next launch can validate again.
      if (error instanceof ApiError && error.status === 401 && await readAuthSession()) {
        await invalidateAuthSession();
      }
      return null;
    } finally {
      restorePromise = null;
    }
  })();

  return restorePromise;
}
