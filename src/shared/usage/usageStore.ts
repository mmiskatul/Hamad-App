import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { MODELS, type ModelId } from '@/shared/models';
import { useModelStore } from '@/shared/models/modelStore';
import { DEFAULT_PLAN, type Plan } from '@/shared/plan';

export const USAGE_STORAGE_KEY = 'oneai.usage';

export type UsageLimits = { requests: number; tokens: number };

export const PLAN_LIMITS: Record<Plan, UsageLimits> = {
  free: { requests: 50, tokens: 1000 },
  pro: { requests: 500, tokens: 4000 },
  business: { requests: Number.POSITIVE_INFINITY, tokens: 8000 },
};

export type ModelUsage = { requests: number; tokens: number };

export type UsageSnapshot = {
  periodStart: number;
  plan: Plan;
  limits: UsageLimits;
  requests: number;
  tokens: number;
  byModel: Partial<Record<ModelId, ModelUsage>>;
};

export type UsageState = UsageSnapshot & {
  hasHydrated: boolean;
  isRefreshing: boolean;
  error: string | null;

  recordUsage: (model: ModelId, tokens: number) => void;
  setUsage: (next: UsageSnapshot) => void;
  setRefreshing: (isRefreshing: boolean) => void;
  setError: (error: string | null) => void;
  reset: (periodStart: number) => void;
};

function startOfMonth(at: number = Date.now()): number {
  const date = new Date(at);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

export const useUsageStore = create<UsageState>()(
  persist(
    (set, get) => ({
      periodStart: startOfMonth(),
      plan: DEFAULT_PLAN,
      limits: PLAN_LIMITS[DEFAULT_PLAN],
      requests: 0,
      tokens: 0,
      byModel: {},
      hasHydrated: false,
      isRefreshing: false,
      error: null,

      recordUsage: (model, tokens) => {
        const previous = get().byModel[model] ?? { requests: 0, tokens: 0 };
        set({
          requests: get().requests + 1,
          tokens: get().tokens + tokens,
          byModel: {
            ...get().byModel,
            [model]: { requests: previous.requests + 1, tokens: previous.tokens + tokens },
          },
        });
      },

      setUsage: (next) => set({ ...next, error: null, isRefreshing: false }),
      setRefreshing: (isRefreshing) => set({ isRefreshing }),
      setError: (error) => set({ error, isRefreshing: false }),

      reset: (periodStart) => set({
        periodStart,
        plan: DEFAULT_PLAN,
        limits: PLAN_LIMITS[DEFAULT_PLAN],
        requests: 0,
        tokens: 0,
        byModel: {},
        isRefreshing: false,
        error: null,
      }),
    }),
    {
      name: USAGE_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ periodStart, plan, limits, requests, tokens, byModel }) => ({
        periodStart,
        plan,
        limits,
        requests,
        tokens,
        byModel,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error && __DEV__) {
          console.warn('[usageStore] rehydrate failed:', error);
        }
        useUsageStore.setState({ hasHydrated: true });
      },
    },
  ),
);

export function usageRatio(used: number, limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return Math.min(1, Math.max(0, used / limit));
}

export type ModelBreakdownRow = {
  id: ModelId;
  name: string;
  brandColor: string;
  requests: number;
  tokens: number;
  share: number;
};

export function modelBreakdown(byModel: UsageState['byModel']): ModelBreakdownRow[] {
  const modelState = useModelStore.getState();
  const catalogue = modelState.hasLoaded ? modelState.catalogue : MODELS;
  const peak = Math.max(
    0,
    ...catalogue.map((model) => byModel[model.id]?.requests ?? 0),
  );

  return catalogue.map((model) => {
    const usage = byModel[model.id] ?? { requests: 0, tokens: 0 };
    return {
      id: model.id,
      name: model.name,
      brandColor: model.brandColor,
      requests: usage.requests,
      tokens: usage.tokens,
      share: peak > 0 ? usage.requests / peak : 0,
    };
  });
}

export default useUsageStore;
