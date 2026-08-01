import { apiRequest } from '@/shared/api/client';
import type { ModelId } from '@/shared/models';

export type UsageResponse = {
  periodStart: string;
  plan: 'free' | 'pro' | 'business';
  limits: { requests: number; tokens: number };
  requests: number;
  tokens: number;
  byModel: Partial<Record<ModelId, { requests: number; tokens: number }>>;
};

export function getUsage(): Promise<UsageResponse> {
  return apiRequest('/usage', { authenticated: true });
}
