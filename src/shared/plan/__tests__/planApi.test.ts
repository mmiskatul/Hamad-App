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
    limits: { requests: 50, tokens: 1000 },
  });
});

describe('updateAccountPlan', () => {
  it.each([
    ['free', 50, 1000],
    ['pro', 500, 4000],
    ['business', 5000, 8000],
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
