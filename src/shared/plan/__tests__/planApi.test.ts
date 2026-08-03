import { apiRequest } from '@/shared/api/client';
import { updateAccountPlan } from '@/shared/plan/planApi';
import { usePlanStore } from '@/shared/plan/planStore';
import { useUsageStore } from '@/shared/usage/usageStore';

jest.mock('@/shared/api/client', () => ({
  apiRequest: jest.fn(),
}));

const mockApiRequest = jest.mocked(apiRequest);

beforeEach(() => {
  mockApiRequest.mockReset();
  usePlanStore.setState({ plan: 'free', hasHydrated: true });
  useUsageStore.setState({
    plan: 'free',
    limits: { requests: 50, tokens: 50_000 },
  });
});

describe('updateAccountPlan', () => {
  it.each([
    ['free', 50, 50_000],
    ['pro', 500, 500_000],
    ['business', 2_000, 1_500_000],
  ] as const)('updates the backend and local stores for %s', async (plan, requests, tokens) => {
    mockApiRequest.mockResolvedValue({
      plan,
      limits: { requests, tokens },
    });

    await updateAccountPlan(plan);

    expect(mockApiRequest).toHaveBeenCalledWith('/settings/plan', {
      method: 'PATCH',
      authenticated: true,
      body: JSON.stringify({ plan }),
    });
    expect(usePlanStore.getState().plan).toBe(plan);
    expect(useUsageStore.getState()).toMatchObject({
      plan,
      limits: { requests, tokens },
    });
  });
});
