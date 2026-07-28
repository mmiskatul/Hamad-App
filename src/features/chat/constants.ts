/*
 * Chat feature constants — the plan matrix taken from Figma (upgrade screen
 * 404:1024) and the root CLAUDE.md plan table.
 *
 * PLAN GATING SHOWN HERE IS PRESENTATION ONLY. What a user may actually call is
 * decided server-side in backend/src/ai/routing.service.ts + the usage module;
 * the lock chips just stop the UI from offering something the server will
 * refuse. Never treat this as the authority.
 */
import { PLANS, type Plan } from '@/shared/plan';

/*
 * Neither the plan nor the model catalogue is a CHAT fact:
 *   - the plan is an ACCOUNT fact (@/shared/plan) — the drawer chip, the model
 *     locks, the upgrade screen and settings all read it;
 *   - the catalogue is a PRODUCT fact (@/shared/models) — the model sheet picks
 *     from it and the usage dashboard names and colours its breakdown rows.
 * Both are re-exported here so chat code keeps one import for "the catalogue
 * and its gating"; the definitions live in shared/ because features may not
 * import each other.
 */
export { PLANS, type Plan };
export {
  MODELS,
  DEFAULT_MODEL,
  findModel,
  isModelAllowed,
  type ModelId,
  type ModelInfo,
} from '@/shared/models';

/*
 * Plan cards on the upgrade screen (Figma 404:1046 onward). Prices are the
 * monthly figures in the design; feature lines are i18n keys.
 */
export type PlanCard = {
  id: Plan;
  price: string;
  featureKeys: readonly string[];
  /** Extra small-caps line under a feature (Figma 404:1120). */
  footnoteKey?: string;
};

export const PLAN_CARDS: readonly PlanCard[] = [
  {
    id: 'free',
    price: '$0',
    featureKeys: [
      'chat.upgrade.free.requests',
      'chat.upgrade.free.tokens',
      'chat.upgrade.free.models',
      'chat.upgrade.free.support',
    ],
  },
  {
    id: 'pro',
    price: '$20',
    featureKeys: [
      'chat.upgrade.pro.requests',
      'chat.upgrade.pro.tokens',
      'chat.upgrade.pro.upload',
      'chat.upgrade.pro.models',
      'chat.upgrade.pro.support',
    ],
    footnoteKey: 'chat.upgrade.pro.modelsNote',
  },
  {
    id: 'business',
    price: '$50',
    featureKeys: [
      'chat.upgrade.business.requests',
      'chat.upgrade.business.tokens',
      'chat.upgrade.business.upload',
      'chat.upgrade.business.models',
      'chat.upgrade.business.support',
    ],
  },
] as const;

export const BILLING_PERIODS = ['monthly', 'annual', 'extra'] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];
