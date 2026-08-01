import { apiRequest } from '@/shared/api/client';
import { requestRegistrationCode } from './registration';

export type EmailCheckResult = {
  email: string;
  registered: boolean;
};

/**
 * Checks the server-owned account collection. If the address is new, request
 * its first OTP before navigation so the verification screen always opens with
 * a live challenge.
 */
export async function checkEmailRegistered(email: string): Promise<EmailCheckResult> {
  const result = await apiRequest<EmailCheckResult>('/auth/check-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  if (!result.registered) {
    await requestRegistrationCode(result.email);
  }
  return result;
}
