import { apiRequest } from '@/shared/api/client';

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiRequest('/auth/change-password', {
    authenticated: true,
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
