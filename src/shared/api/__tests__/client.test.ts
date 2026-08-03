import { apiRequest } from '../client';
import {
  clearAuthSession,
  clearAuthSessionMemoryCache,
  readAuthSession,
  saveAuthSession,
  subscribeAuthSessionInvalidation,
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

it('does not advertise JSON for a bodyless DELETE request', async () => {
  await saveAuthSession(initialSession);
  fetchMock.mockResolvedValueOnce(jsonResponse({}, 204));

  await expect(
    apiRequest('/conversations/conversation-1', {
      method: 'DELETE',
      authenticated: true,
    }),
  ).resolves.toEqual({});

  const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
  expect(request.method).toBe('DELETE');
  expect(request.body).toBeUndefined();
  expect((request.headers as Headers).get('Content-Type')).toBeNull();
  expect((request.headers as Headers).get('Authorization')).toBe(
    `Bearer ${initialSession.accessToken}`,
  );
});

it('keeps the JSON content type for string request bodies', async () => {
  fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

  await apiRequest('/example', {
    method: 'POST',
    body: JSON.stringify({ value: true }),
  });

  const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
  expect((request.headers as Headers).get('Content-Type')).toBe('application/json');
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

it('keeps the persisted session when refresh fails because the network is unavailable', async () => {
  await saveAuthSession(initialSession);
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ error: { code: 'TOKEN_EXPIRED', message: 'Expired' } }, 401),
    )
    .mockRejectedValueOnce(new Error('Network unavailable'));

  await expect(apiRequest('/auth/me', { authenticated: true })).rejects.toMatchObject({
    status: 0,
    code: 'NETWORK_ERROR',
  });
  await expect(readAuthSession()).resolves.toEqual(initialSession);
});

it('clears the persisted session when the refresh token is rejected', async () => {
  await saveAuthSession(initialSession);
  const invalidated = jest.fn();
  const unsubscribe = subscribeAuthSessionInvalidation(invalidated);
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ error: { code: 'TOKEN_EXPIRED', message: 'Expired' } }, 401),
    )
    .mockResolvedValueOnce(
      jsonResponse({ error: { code: 'INVALID_SESSION', message: 'Invalid session' } }, 401),
    );

  await expect(apiRequest('/auth/me', { authenticated: true })).rejects.toMatchObject({
    status: 401,
    code: 'INVALID_SESSION',
  });
  await expect(readAuthSession()).resolves.toBeNull();
  expect(invalidated).toHaveBeenCalledTimes(1);
  unsubscribe();
});
