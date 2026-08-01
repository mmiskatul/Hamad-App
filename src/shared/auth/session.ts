import * as Keychain from 'react-native-keychain';

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type AuthSession = {
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
  sessionToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  sessionExpiresAt: string;
};

const AUTH_SESSION_SERVICE = 'com.oneaihub.app.auth-session';
let cachedSession: AuthSession | null | undefined;

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<AuthSession>;
  return (
    typeof session.accessToken === 'string' &&
    typeof session.refreshToken === 'string' &&
    typeof session.sessionToken === 'string' &&
    session.tokenType === 'Bearer' &&
    typeof session.sessionExpiresAt === 'string' &&
    Boolean(session.user && typeof session.user.id === 'string')
  );
}

export async function saveAuthSession(session: AuthSession): Promise<void> {
  cachedSession = session;
  await Keychain.setGenericPassword(session.user.id, JSON.stringify(session), {
    service: AUTH_SESSION_SERVICE,
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

export async function readAuthSession(): Promise<AuthSession | null> {
  if (cachedSession !== undefined) return cachedSession;

  const credentials = await Keychain.getGenericPassword({ service: AUTH_SESSION_SERVICE });
  if (!credentials) {
    cachedSession = null;
    return null;
  }

  try {
    const session: unknown = JSON.parse(credentials.password);
    if (!isAuthSession(session) || Date.parse(session.sessionExpiresAt) <= Date.now()) {
      await clearAuthSession();
      return null;
    }
    cachedSession = session;
    return session;
  } catch {
    await clearAuthSession();
    return null;
  }
}

export async function clearAuthSession(): Promise<void> {
  cachedSession = null;
  await Keychain.resetGenericPassword({ service: AUTH_SESSION_SERVICE });
}

export function clearAuthSessionMemoryCache(): void {
  cachedSession = undefined;
}
