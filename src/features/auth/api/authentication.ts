import { apiRequest } from '@/shared/api/client';
import { saveAuthSession, type AuthSession } from '@/shared/auth';

export async function loginWithPassword(email: string, password: string): Promise<AuthSession> {
  const session = await apiRequest<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await saveAuthSession(session);
  return session;
}
