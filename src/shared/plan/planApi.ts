import { apiRequest } from '@/shared/api/client';
import { useUsageStore, type UsageLimits } from '@/shared/usage/usageStore';

import { usePlanStore, type Plan } from './planStore';

export type PlanUpdateResponse = {
  plan: Plan;
  limits: UsageLimits;
};

export async function updateAccountPlan(plan: Plan): Promise<PlanUpdateResponse> {
  const updated = await apiRequest<PlanUpdateResponse>('/settings/plan', {
    method: 'PATCH',
    authenticated: true,
    body: JSON.stringify({ plan }),
  });
  usePlanStore.getState().setPlan(updated.plan);
  useUsageStore.setState({ plan: updated.plan, limits: updated.limits });
  return updated;
}
