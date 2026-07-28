/*
 * Chat feature — public surface.
 *
 * The first module of the Figma "Core" section (node 140:1059). Every colour and
 * type value comes from useTheme() (@/shared/theme), because the Core frames
 * are designed in both light and dark. Never import auth internals here — the
 * auth subtree has its own palette hook (useAuthPalette), and cross-feature
 * imports are forbidden.
 *
 * Screens are consumed by thin route files under src/app, which import from this
 * index and never reach into the feature's internals.
 */
export { default as ChatHomeScreen } from './screens/ChatHomeScreen';
export { default as ConversationScreen } from './screens/ConversationScreen';
export { default as UpgradePlanScreen } from './screens/UpgradePlanScreen';
export { default as ChatHistoryScreen } from './screens/ChatHistoryScreen';
export { default as ChatFilesScreen } from './screens/ChatFilesScreen';
export {
  MODELS,
  PLAN_CARDS,
  DEFAULT_MODEL,
  findModel,
  isModelAllowed,
  type ModelId,
  type ModelInfo,
  type Plan,
} from './constants';
export {
  useChatStore,
  shouldShowUpsell,
  orderedConversations,
  UPSELL_AFTER_PROMPTS,
} from './store/chatStore';
export type { Conversation, ChatMessage, ChatAttachment } from './store/chatStore';
