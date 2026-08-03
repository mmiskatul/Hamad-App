import { restoreAuthSession } from '../restoreSession';
import {
  clearAuthSession,
  clearAuthSessionMemoryCache,
  readAuthSession,
  saveAuthSession,
  type AuthSession,
} from '@/shared/auth';

const fetchMock = jest.fn();

function session(suffix: string): AuthSession {
  return {
    user: {
      id: `user-${suffix}`,
      email: `${suffix}@example.com`,
      name: 'Member',
      createdAt: '2026-08-01T00:00:00.000Z',
    },
    accessToken: `access-${suffix}`,
    refreshToken: `refresh-${suffix}`,
    sessionToken: `session-${suffix}`,
    tokenType: 'Bearer',
    expiresIn: '15m',
    sessionExpiresAt: '2099-08-31T00:00:00.000Z',
  };
}

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

beforeEach(async () => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://api.test/api/v1';
  await clearAuthSession();
  clearAuthSessionMemoryCache();
});

it('rotates the refresh token and validates the new access token on startup', async () => {
  const stored = session('valid');
  const refreshed = { ...stored, accessToken: 'access-new', refreshToken: 'refresh-new' };
  await saveAuthSession(stored);
  fetchMock
    .mockResolvedValueOnce(response(refreshed))
    .mockResolvedValueOnce(response({ user: refreshed.user }));

  await expect(restoreAuthSession()).resolves.toEqual(refreshed);

  expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
    'http://api.test/api/v1/auth/refresh',
    'http://api.test/api/v1/auth/me',
  ]);
  await expect(readAuthSession()).resolves.toEqual(refreshed);
});

it('clears a session and fails closed when the refresh token is rejected', async () => {
  await saveAuthSession(session('rejected'));
  fetchMock.mockResolvedValueOnce(response({
    error: { code: 'INVALID_SESSION', message: 'Invalid session' },
  }, 401));

  await expect(restoreAuthSession()).resolves.toBeNull();
  await expect(readAuthSession()).resolves.toBeNull();
});

it('does not open protected screens when startup validation cannot reach the server', async () => {
  const stored = session('offline');
  await saveAuthSession(stored);
  fetchMock.mockRejectedValueOnce(new Error('offline'));

  await expect(restoreAuthSession()).resolves.toBeNull();
  // Keep credentials for a later retry, but this boot is unauthenticated.
  await expect(readAuthSession()).resolves.toEqual(stored);
});
