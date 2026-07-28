import { ConversationScreen } from '@/features/chat';

/*
 * "/conversation" — the open chat's transcript (Figma 144:1314 thinking,
 * 146:1652 answered). Takes its target from the chat store's `activeId`, never a
 * route param; deep-linked without one, it redirects to /home.
 */
export default ConversationScreen;
