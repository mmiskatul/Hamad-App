import { apiRequest } from '@/shared/api/client';
import { saveAuthSession, type AuthenticatedUser, type AuthSession } from '@/shared/auth';
import { useProfileStore } from '@/shared/profile';

export type RequestCodeResult = {
  email: string;
  sent: boolean;
  expiresInSeconds: number;
  developmentCode?: string;
};

export type VerifyCodeResult = {
  verificationToken: string;
};

export type RegisteredUser = AuthenticatedUser;

export class RegistrationSessionPersistenceError extends Error {
  constructor() {
    super('The account was created, but its session could not be stored.');
    this.name = 'RegistrationSessionPersistenceError';
  }
}

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

export async function createRegistrationAccount(input: {
  email: string;
  name: string;
  password: string;
  verificationToken: string;
}): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/auth/registration', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  try {
    await saveAuthSession(session);
    useProfileStore.getState().replaceProfile({
      name: session.user.name,
      email: session.user.email,
      phone: '',
      avatarUri: null,
    });
  } catch {
    // The POST has already succeeded at this point. Let the screen recover into
    // the existing-account login flow instead of claiming creation failed and
    // inviting a duplicate registration attempt.
    throw new RegistrationSessionPersistenceError();
  }
  return session;
}
