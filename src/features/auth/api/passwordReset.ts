import { apiRequest } from '@/shared/api/client';

export type PasswordResetCodeResult = {
  email: string;
  sent: boolean;
  expiresInSeconds: number;
};

export function requestPasswordResetCode(email: string): Promise<PasswordResetCodeResult> {
  return apiRequest('/auth/password-reset/request-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function verifyPasswordResetCode(
  email: string,
  code: string,
): Promise<{ resetToken: string }> {
  return apiRequest('/auth/password-reset/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export function resetPassword(input: {
  email: string;
  password: string;
  resetToken: string;
}): Promise<void> {
  return apiRequest('/auth/password-reset', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
