import { useCallback, useEffect, useRef } from 'react';

import { requestReply } from '../api/requestReply';
import { useChatStore } from '../store/chatStore';

import { useTranslation } from '@/shared/i18n/useTranslation';

/*
 * The send-and-receive orchestration that the conversation screen needs.
 *
 * This used to live inline in both `FreshProjectChatContent` and
 * `ConversationContent`, and the two drifted slightly — the abort controller
 * was a real piece of state in one and a manual `replyControllerRef` in the
 * other, and the "aborted but still resolved" race was a TODO in both. A
 * single hook freezes the contract.
 *
 * Contract:
 *   - Each call to `onSend` aborts the previous in-flight reply (if any), so a
 *     new prompt always wins over a stale one.
 *   - The resolved reply is only filed if THIS controller is still the active
 *     one. A late resolve that's already been aborted is dropped silently.
 *   - On unmount, the in-flight reply is aborted so a `receiveReply` cannot
 *     land on a conversation the user has already left.
 *   - The `t` dependency is `chat.conversation.error`; using a function in
 *     `useCallback` deps keeps the callback stable across re-renders.
 */
export function useSendPrompt(targetId: string | null) {
  const { t } = useTranslation();
  const controllerRef = useRef<AbortController | null>(null);

  // Abort on unmount — otherwise a resolved reply would race back into
  // `receiveReply` for a conversation the user has already navigated away from.
  useEffect(
    () => () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    },
    [],
  );

  const onSend = useCallback(
    (message: string) => {
      useChatStore.getState().sendPrompt(message);

      const newActiveId = targetId ?? useChatStore.getState().activeId;
      if (!newActiveId) return;

      // Cancel the previous reply so the new one wins cleanly.
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      requestReply(message, { signal: controller.signal })
        .then((reply) => {
          if (controllerRef.current === controller) {
            useChatStore.getState().receiveReply(newActiveId, reply);
          }
        })
        .catch((error: unknown) => {
          if (
            controllerRef.current === controller &&
            error instanceof Error &&
            error.name !== 'AbortError'
          ) {
            useChatStore.getState().receiveReply(newActiveId, t('chat.conversation.error'));
          }
        });
    },
    [targetId, t],
  );

  return onSend;
}

export default useSendPrompt;