/*
 * Tier mix breakdowns on the Usage Dashboard (Figma 142:496 — the Tier mix
 * card). The dashboard draws this until the server-side usage endpoint lands:
 * a fresh install otherwise shows an empty card, which reads as a bug.
 *
 * Numbers below are the Figma figures the design was approved on (Free/Pro/
 * Business user counts, share, and revenue). Same shape as the model
 * breakdown — relative shares, not absolutes — so the bar's segments sum to
 * 100% and the revenue column totals match what the design lays out.
 *
 * COLOURS: a single muted ramp (`accent` / `accentTint` / `muted`) so the bar
 * reads as one chart, not a legend. The card sits on bg/surface, and the
 * tier names alone tell the user which slice is which.
 *
 * TODO(backend): replace the constant with the response from the usage
 * endpoint — adopt the row shape verbatim so the card does not need to
 * change when the data does.
 */
import { PLANS, type Plan } from '@/shared/plan';

export type TierMixRow = {
  /** Plan id — matches `chat.plan.${id}Name` for the localised label. */
  plan: Plan;
  users: number;
  /** USD, this period. */
  revenue: number;
};

export const TIER_MIX: readonly TierMixRow[] = PLANS.map((plan) => {
  switch (plan) {
    case 'free':
      return { plan: 'free', users: 8400, revenue: 0 };
    case 'pro':
      return { plan: 'pro', users: 2140, revenue: 10700 };
    case 'business':
      return { plan: 'business', users: 312, revenue: 7540 };
  }
});

export type TierMixTotals = {
  users: number;
  revenue: number;
  /** Each row's share of the total user count, in 0..1. */
  shares: Record<Plan, number>;
};
