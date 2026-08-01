import {
  requestPasswordResetCode,
  resetPassword,
  verifyPasswordResetCode,
} from '../passwordReset';

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

it('uses the backend request, verification, and password-reset endpoints', async () => {
  fetchMock
    .mockResolvedValueOnce(
      jsonResponse(
        { email: 'user@example.com', sent: true, expiresInSeconds: 600 },
        202,
      ),
    )
    .mockResolvedValueOnce(jsonResponse({ resetToken: 'verified-reset-token' }))
    .mockResolvedValueOnce(jsonResponse({}, 204));

  await requestPasswordResetCode('user@example.com');
  await verifyPasswordResetCode('user@example.com', '1234');
  await resetPassword({
    email: 'user@example.com',
    password: 'new-password-456',
    resetToken: 'verified-reset-token',
  });

  expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
    'http://api.test/api/v1/auth/password-reset/request-code',
    'http://api.test/api/v1/auth/password-reset/verify-code',
    'http://api.test/api/v1/auth/password-reset',
  ]);
  expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
    email: 'user@example.com',
    password: 'new-password-456',
    resetToken: 'verified-reset-token',
  });
});
