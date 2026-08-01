import { checkEmailRegistered } from '../checkEmailRegistered';
import {
  createRegistrationAccount,
  verifyRegistrationCode,
} from '../registration';

const fetchMock = jest.fn();

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://api.test/api/v1';
});

it('checks an existing email without requesting a registration code', async () => {
  fetchMock.mockResolvedValueOnce(
    jsonResponse({ email: 'user@example.com', registered: true }),
  );

  await expect(checkEmailRegistered('USER@example.com')).resolves.toEqual({
    email: 'user@example.com',
    registered: true,
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/v1/auth/check-email');
});

it('requests an OTP before returning a new email result', async () => {
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse({ email: 'new@example.com', registered: false }),
    )
    .mockResolvedValueOnce(
      jsonResponse({ email: 'new@example.com', sent: true, expiresInSeconds: 600 }, 202),
    );

  await expect(checkEmailRegistered('new@example.com')).resolves.toMatchObject({
    registered: false,
  });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1][0]).toBe(
    'http://api.test/api/v1/auth/registration/request-code',
  );
});

it('sends the OTP and one-time proof in the typed registration requests', async () => {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ verificationToken: 'proof-token' }))
    .mockResolvedValueOnce(
      jsonResponse({
        user: {
          id: '1',
          email: 'new@example.com',
          name: 'Sam Rivera',
          createdAt: '2026-08-01T00:00:00.000Z',
        },
        accessToken: 'access-token',
        refreshToken: 'rt_refresh-token',
        sessionToken: 'st_session-token',
        tokenType: 'Bearer',
        expiresIn: '15m',
        sessionExpiresAt: '2026-08-31T00:00:00.000Z',
      }, 201),
    );

  await verifyRegistrationCode('new@example.com', '1234');
  await createRegistrationAccount({
    email: 'new@example.com',
    name: 'Sam Rivera',
    password: 'sup3rsecret',
    verificationToken: 'proof-token',
  });

  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    email: 'new@example.com',
    code: '1234',
  });
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
    password: 'sup3rsecret',
    verificationToken: 'proof-token',
  });
});
