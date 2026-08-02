import { apiRequest } from '@/shared/api/client';
import { readAuthSession } from '@/shared/auth';
import type { ModelId } from '@/shared/models';
import { usePlanStore, type Plan } from '@/shared/plan';

import { useUsageStore, type UsageLimits, type UsageSnapshot } from './usageStore';

export type UsageResponse = {
  periodStart: string;
  plan: Plan;
  limits: UsageLimits;
  requests: number;
  tokens: number;
  byModel: Partial<Record<ModelId, { requests: number; tokens: number }>>;
};

let refreshSequence = 0;

export function getUsage(): Promise<UsageResponse> {
  return apiRequest('/usage', { authenticated: true });
}

export function toUsageSnapshot(response: UsageResponse): UsageSnapshot {
  return {
    periodStart: Date.parse(response.periodStart),
    plan: response.plan,
    limits: response.limits,
    requests: response.requests,
    tokens: response.tokens,
    byModel: response.byModel,
  };
}

export async function refreshUsageSnapshot(): Promise<UsageSnapshot | null> {
  const session = await readAuthSession();
  if (!session) return null;

  const sequence = ++refreshSequence;
  const usage = useUsageStore.getState();
  usage.setRefreshing(true);
  try {
    const snapshot = toUsageSnapshot(await getUsage());
    // A startup refresh can overlap the post-reply refresh. Never allow its
    // older snapshot to arrive later and overwrite the newest totals.
    if (sequence === refreshSequence) {
      useUsageStore.getState().setUsage(snapshot);
      usePlanStore.getState().setPlan(snapshot.plan);
    }
    return snapshot;
  } catch (error) {
    if (sequence === refreshSequence) {
      useUsageStore.getState().setError(
        error instanceof Error ? error.message : 'Could not refresh usage.',
      );
    }
    throw error;
  }
}
