import type React from 'react';
import type { SvgProps } from 'react-native-svg';

import { planIncludes, type Plan } from '@/shared/plan';

import ChatgptLogo from '../../../assets/brand/chatgpt.svg';
import ClaudeLogo from '../../../assets/brand/claude.svg';
import DeepseekLogo from '../../../assets/brand/deepseek.svg';
import GeminiLogo from '../../../assets/brand/gemini.svg';
import GrokLogo from '../../../assets/brand/grok.svg';
import PerplexityLogo from '../../../assets/brand/perplexity.svg';

/*
 * The six AI models the app offers, and which plan unlocks each.
 *
 * This lives in shared/ for the same reason the plan does: it is a PRODUCT fact,
 * not a chat fact. The chat model sheet picks from it, and the usage dashboard
 * names and colours every row of its model breakdown — two features, and
 * features may not import each other.
 *
 * PLAN GATING HERE IS PRESENTATION ONLY. What a user may actually call is
 * decided server-side (backend/src/ai/routing.service.ts + the usage module);
 * `minPlan` only stops the UI offering something the server will refuse.
 *
 * TODO(backend): fetch the catalogue (already filtered by the caller's plan)
 * instead of hardcoding it.
 */
export type ModelId = 'gpt' | 'deepseek' | 'gemini' | 'claude' | 'perplexity' | 'grok';

export type ModelInfo = {
  id: ModelId;
  /** Product name, e.g. "ChatGPT". */
  name: string;
  /** Vendor shown after the slash, e.g. "OpenAI". */
  vendor: string;
  /** i18n key for the one-line description. */
  descriptionKey: string;
  /** Lowest plan that may select it (Figma's Pro / Business lock chips). */
  minPlan: Plan;
  /**
   * Vendor brand colour, used for the usage dashboard's 8pt legend dot and its
   * progress fill (Figma 140:2187 onward). These are literal brand hexes, NOT
   * theme tokens — the point of the dot is that it identifies the vendor, so it
   * must read the same in light and dark.
   */
  brandColor: string;
  /**
   * Vendor brand mark (user-supplied .svg from assets/brand). Shown on the model
   * sheet's 52pt avatar. The marks carry their own colours, so they render the
   * same in light and dark — same principle as brandColor.
   */
  logo: React.FC<SvgProps>;
};

/*
 * Order and copy mirror the model sheet exactly. NOTE: the Figma row reads
 * "Perplexit" — a typo, corrected here, same standing rule as the "accoount"
 * typo in the auth section.
 */
export const MODELS: readonly ModelInfo[] = [
  {
    id: 'gpt',
    name: 'ChatGPT',
    vendor: 'OpenAI',
    descriptionKey: 'chat.models.gpt',
    minPlan: 'free',
    brandColor: '#10A37F',
    logo: ChatgptLogo,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    vendor: 'DeepSeek',
    descriptionKey: 'chat.models.deepseek',
    minPlan: 'free',
    brandColor: '#4D6BFE',
    logo: DeepseekLogo,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    vendor: 'Google',
    descriptionKey: 'chat.models.gemini',
    minPlan: 'pro',
    brandColor: '#6C9CEB',
    logo: GeminiLogo,
  },
  // Perplexity and Claude were swapped (position AND plan tier) per the updated
  // Figma model sheet: Perplexity now sits at Pro, Claude at Business.
  {
    id: 'perplexity',
    name: 'Perplexity',
    vendor: 'Perplexity',
    descriptionKey: 'chat.models.perplexity',
    minPlan: 'pro',
    brandColor: '#42EEF4',
    logo: PerplexityLogo,
  },
  {
    id: 'claude',
    name: 'Claude',
    vendor: 'Anthropic',
    descriptionKey: 'chat.models.claude',
    minPlan: 'business',
    brandColor: '#D97757',
    logo: ClaudeLogo,
  },
  {
    id: 'grok',
    name: 'Grok',
    vendor: 'X',
    descriptionKey: 'chat.models.grok',
    minPlan: 'business',
    brandColor: '#323E53',
    logo: GrokLogo,
  },
] as const;

/** The Figma frame rests on Gemini, but Free may only select GPT. */
export const DEFAULT_MODEL: ModelId = 'gpt';

export function findModel(id: ModelId): ModelInfo {
  return MODELS.find((model) => model.id === id) ?? MODELS[0];
}

export function isModelAllowed(model: ModelInfo, plan: Plan): boolean {
  return planIncludes(plan, model.minPlan);
}
