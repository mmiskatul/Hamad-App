import { apiRequest } from '@/shared/api/client';

export type RequestCodeResult = {
  email: string;
  sent: boolean;
  expiresInSeconds: number;
  developmentCode?: string;
};

export type VerifyCodeResult = {
  verificationToken: string;
};

export type RegisteredUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export function requestRegistrationCode(email: string): Promise<RequestCodeResult> {
  return apiRequest('/auth/registration/request-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function verifyRegistrationCode(email: string, code: string): Promise<VerifyCodeResult> {
  return apiRequest('/auth/registration/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
}

export function createRegistrationAccount(input: {
  email: string;
  name: string;
  password: string;
  verificationToken: string;
}): Promise<{ user: RegisteredUser }> {
  return apiRequest('/auth/registration', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
