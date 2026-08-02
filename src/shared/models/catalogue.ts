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
 * This file holds the STATIC product metadata the mobile client owns: logos,
 * colours, default copy keys and fallback ordering. Runtime availability is
 * loaded from the backend and layered on top through shared/models/modelStore.
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
  /** Whether the current backend has this model configured and available. */
  available: boolean;
  /**
   * Vendor brand colour, used for the usage dashboard's 8pt legend dot and its
   * progress fill. These are literal brand hexes, NOT theme tokens.
   */
  brandColor: string;
  /**
   * Vendor brand mark (user-supplied .svg from assets/brand). Shown on the
   * model sheet's 52pt avatar.
   */
  logo: React.FC<SvgProps>;
};

/*
 * Order and copy mirror the model sheet exactly. NOTE: the Figma row reads
 * "Perplexit" - a typo, corrected here.
 */
export const MODELS: readonly ModelInfo[] = [
  {
    id: 'gpt',
    name: 'ChatGPT',
    vendor: 'OpenAI',
    descriptionKey: 'chat.models.gpt',
    minPlan: 'free',
    available: true,
    brandColor: '#10A37F',
    logo: ChatgptLogo,
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    vendor: 'DeepSeek',
    descriptionKey: 'chat.models.deepseek',
    minPlan: 'free',
    available: true,
    brandColor: '#4D6BFE',
    logo: DeepseekLogo,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    vendor: 'Google',
    descriptionKey: 'chat.models.gemini',
    minPlan: 'pro',
    available: true,
    brandColor: '#6C9CEB',
    logo: GeminiLogo,
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    vendor: 'Perplexity',
    descriptionKey: 'chat.models.perplexity',
    minPlan: 'pro',
    available: true,
    brandColor: '#42EEF4',
    logo: PerplexityLogo,
  },
  {
    id: 'claude',
    name: 'Claude',
    vendor: 'Anthropic',
    descriptionKey: 'chat.models.claude',
    minPlan: 'business',
    available: true,
    brandColor: '#D97757',
    logo: ClaudeLogo,
  },
  {
    id: 'grok',
    name: 'Grok',
    vendor: 'X',
    descriptionKey: 'chat.models.grok',
    minPlan: 'business',
    available: true,
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
  return model.available && planIncludes(plan, model.minPlan);
}