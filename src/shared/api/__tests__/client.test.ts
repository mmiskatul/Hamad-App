import { apiRequest } from '../client';
import {
  clearAuthSession,
  clearAuthSessionMemoryCache,
  readAuthSession,
  saveAuthSession,
  type AuthSession,
} from '@/shared/auth';

const fetchMock = jest.fn();

const initialSession: AuthSession = {
  user: {
    id: 'user-1',
    email: 'member@example.com',
    name: 'Member',
    createdAt: '2026-08-01T00:00:00.000Z',
  },
  accessToken: 'expired-access-token',
  refreshToken: 'rt_original-refresh-token-value',
  sessionToken: 'st_session-token-value',
  tokenType: 'Bearer',
  expiresIn: '15m',
  sessionExpiresAt: '2099-08-31T00:00:00.000Z',
};

function jsonResponse(body: unknown, status = 200): Response {
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

it('refreshes once after an expired access token and retries the protected request', async () => {
  const refreshedSession: AuthSession = {
    ...initialSession,
    accessToken: 'new-access-token',
    refreshToken: 'rt_rotated-refresh-token-value',
  };
  await saveAuthSession(initialSession);

  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ error: { code: 'TOKEN_EXPIRED', message: 'Expired' } }, 401),
    )
    .mockResolvedValueOnce(jsonResponse(refreshedSession))
    .mockResolvedValueOnce(jsonResponse({ user: refreshedSession.user }));

  await expect(
    apiRequest('/auth/me', { authenticated: true }),
  ).resolves.toEqual({ user: refreshedSession.user });

  expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
    'http://api.test/api/v1/auth/me',
    'http://api.test/api/v1/auth/refresh',
    'http://api.test/api/v1/auth/me',
  ]);
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
    refreshToken: initialSession.refreshToken,
    sessionToken: initialSession.sessionToken,
  });
  expect((fetchMock.mock.calls[0][1].headers as Headers).get('Authorization')).toBe(
    `Bearer ${initialSession.accessToken}`,
  );
  expect((fetchMock.mock.calls[2][1].headers as Headers).get('Authorization')).toBe(
    `Bearer ${refreshedSession.accessToken}`,
  );
  await expect(readAuthSession()).resolves.toEqual(refreshedSession);
});

it('rejects protected requests when no secure session exists', async () => {
  await expect(apiRequest('/auth/me', { authenticated: true })).rejects.toMatchObject({
    status: 401,
    code: 'AUTH_SESSION_MISSING',
  });
  expect(fetchMock).not.toHaveBeenCalled();
});
