import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/*
 * The signed-in user's subscription tier.
 *
 * This lives in shared/, not in features/chat, because the plan is an ACCOUNT
 * fact, not a chat fact: the drawer's plan tag, the model locks, the upgrade
 * screen's "Current Plan" button and (soon) settings + subscription all read it.
 * Features may not import each other, so the moment a second feature needs it,
 * a chat-owned copy becomes a cross-feature import — promote once, here.
 *
 * PRESENTATION ONLY. Entitlement is decided server-side (backend usage module +
 * ai/routing.service.ts); this value only stops the UI offering what the server
 * will refuse, and must never be treated as the authority.
 *
 * TODO(backend): replace the persisted local value with the plan returned by the
 * session/usage endpoint (TanStack Query), keeping this store as its cache.
 */
export const PLANS = ['free', 'pro', 'business'] as const;
export type Plan = (typeof PLANS)[number];

/** Rank used to answer "does this plan include that tier's features?". */
const PLAN_RANK: Record<Plan, number> = { free: 0, pro: 1, business: 2 };

export function planIncludes(plan: Plan, required: Plan): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[required];
}

export const DEFAULT_PLAN: Plan = 'free';
export const PLAN_STORAGE_KEY = 'oneai.plan';

export type PlanState = {
  plan: Plan;
  hasHydrated: boolean;
  setPlan: (plan: Plan) => void;
};

export const usePlanStore = create<PlanState>()(
  persist(
    (set) => ({
      plan: DEFAULT_PLAN,
      hasHydrated: false,
      setPlan: (plan) => set({ plan }),
    }),
    {
      name: PLAN_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ plan }) => ({ plan }),
      onRehydrateStorage: () => (state, error) => {
        if (error && __DEV__) {
          console.warn('[planStore] rehydrate failed:', error);
        }
        usePlanStore.setState({ hasHydrated: true });
      },
    },
  ),
);

/** The current plan, re-rendering the caller when it changes. */
export function usePlan(): Plan {
  return usePlanStore((state) => state.plan);
}

/** Next tier for upgrade CTAs (free -> pro, pro -> business, business -> null). */
export function useNextPlan(): 'pro' | 'business' | null {
  const plan = usePlan();
  if (plan === 'free') return 'pro';
  if (plan === 'pro') return 'business';
  return null;
}

export function useCanUpgrade(): boolean {
  return usePlanStore((state) => state.plan === 'free');
}

export default usePlanStore;
