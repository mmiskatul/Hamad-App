import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { MODELS, type ModelId } from '@/shared/models';
import { type Plan } from '@/shared/plan';

/*
 * This billing period's consumption: requests, tokens, and the per-model
 * breakdown behind the Usage Dashboard (Figma 142:496).
 *
 * In shared/ rather than the dashboard feature because usage is an ACCOUNT
 * fact with more than one reader: the dashboard draws it, and the conversation
 * view's "1.2K/5K TOKENS • 20/100 REQ • FREE" chip (Figma 144:1314, next batch)
 * reads the same numbers. Same argument that put the plan in @/shared/plan.
 *
 * DISPLAY ONLY, and more provisional than the plan store: the server is the
 * only thing that can count a request. Nothing in the app writes these numbers
 * today, so a fresh install shows zeroes — that is the honest state, not a bug.
 *
 * TODO(backend): replace the persisted values with the usage endpoint's
 * response (TanStack Query), keeping this store as its cache. `periodStart`
 * exists so a stale cached month can be detected and discarded rather than
 * shown as if it were current.
 */
export const USAGE_STORAGE_KEY = 'oneai.usage';

/** Monthly allowances per plan — the root CLAUDE.md matrix. */
export const PLAN_LIMITS: Record<Plan, { requests: number; tokens: number }> = {
  // Business is "unlimited requests" in the matrix. Infinity is deliberate: it
  // makes every ratio 0 and every "x / y" render as unlimited from ONE value,
  // instead of each surface special-casing the Business tier.
  free: { requests: 50, tokens: 1000 },
  pro: { requests: 500, tokens: 4000 },
  business: { requests: Number.POSITIVE_INFINITY, tokens: 8000 },
};

export type ModelUsage = { requests: number; tokens: number };

export type UsageState = {
  /** Epoch ms for the first day of the period these counters cover. */
  periodStart: number;
  requests: number;
  tokens: number;
  byModel: Partial<Record<ModelId, ModelUsage>>;
  hasHydrated: boolean;

  /** Records one call. Optimistic only — the server remains the authority. */
  recordUsage: (model: ModelId, tokens: number) => void;
  /** Replaces everything with a server snapshot. */
  setUsage: (next: Omit<UsageState, 'hasHydrated' | 'recordUsage' | 'setUsage' | 'reset'>) => void;
  /** New billing period: counters back to zero. */
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
      requests: 0,
      tokens: 0,
      byModel: {},
      hasHydrated: false,

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

      setUsage: (next) => set(next),

      reset: (periodStart) => set({ periodStart, requests: 0, tokens: 0, byModel: {} }),
    }),
    {
      name: USAGE_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ periodStart, requests, tokens, byModel }) => ({
        periodStart,
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

/**
 * Fraction of an allowance consumed, clamped to 0..1.
 *
 * An unlimited allowance reads as 0, not 1: a full ring would say "you are out"
 * to the tier that can never run out.
 */
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
  /** Share of the busiest model's requests — what the bar's width shows. */
  share: number;
};

/*
 * Breakdown rows in catalogue order, each bar scaled against the BUSIEST model
 * rather than against the plan's request limit. Scaling to the limit would
 * leave every bar a stub early in the month, which is exactly when the
 * comparison is interesting; relative bars answer the question the section
 * asks ("what am I actually using?").
 */
export function modelBreakdown(byModel: UsageState['byModel']): ModelBreakdownRow[] {
  const peak = Math.max(
    0,
    ...MODELS.map((model) => byModel[model.id]?.requests ?? 0),
  );

  return MODELS.map((model) => {
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
