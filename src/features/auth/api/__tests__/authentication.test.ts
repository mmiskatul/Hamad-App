import * as Keychain from 'react-native-keychain';

import { loginWithPassword } from '../authentication';
import { clearAuthSession, clearAuthSessionMemoryCache, type AuthSession } from '@/shared/auth';

const fetchMock = jest.fn();

const session: AuthSession = {
  user: {
    id: 'user-1',
    email: 'member@example.com',
    name: 'Member',
    createdAt: '2026-08-01T00:00:00.000Z',
  },
  accessToken: 'access-token',
  refreshToken: 'rt_refresh-token-value',
  sessionToken: 'st_session-token-value',
  tokenType: 'Bearer',
  expiresIn: '15m',
  sessionExpiresAt: '2099-08-31T00:00:00.000Z',
};

beforeEach(async () => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://api.test/api/v1';
  await clearAuthSession();
  clearAuthSessionMemoryCache();
  jest.mocked(Keychain.setGenericPassword).mockClear();
});

it('logs in with the backend and stores all session credentials in Keychain', async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => session,
  } as Response);

  await expect(loginWithPassword('member@example.com', 'correct-password')).resolves.toEqual(
    session,
  );

  expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/v1/auth/login');
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    email: 'member@example.com',
    password: 'correct-password',
  });
  expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
    session.user.id,
    JSON.stringify(session),
    expect.objectContaining({ service: 'com.oneaihub.app.auth-session' }),
  );
});
