import { apiRequest } from '@/shared/api/client';

export type AccountMemory = {
  enabled: boolean;
  nickname: string;
  occupation: string;
  about: string;
  summary: string;
  summaryUpdatedAt: string | null;
};


export type AboutResponse = {
  name: string;
  version: string;
  apiVersion: string;
  supportEmail: string;
};

export function getMemory(): Promise<AccountMemory> {
  return apiRequest('/settings/memory', { authenticated: true });
}

export function updateMemory(
  patch: Partial<Pick<AccountMemory, 'enabled' | 'nickname' | 'occupation' | 'about'>>,
): Promise<AccountMemory> {
  return apiRequest('/settings/memory', {
    authenticated: true,
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function appendMemorySummary(text: string): Promise<AccountMemory> {
  return apiRequest('/settings/memory/summary', {
    authenticated: true,
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function clearMemorySummary(): Promise<void> {
  return apiRequest('/settings/memory/summary', {
    authenticated: true,
    method: 'DELETE',
  });
}

export function getAbout(): Promise<AboutResponse> {
  return apiRequest('/about');
}
