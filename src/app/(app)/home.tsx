import { ChatHomeScreen } from '@/features/chat';

/*
 * "/home" — the app's landing screen after authentication (Figma 404:1772).
 * Reached by router.replace() from /password (login) and /new-password (sign-up
 * complete), so the auth stack is not left underneath it.
 */
export default ChatHomeScreen;
