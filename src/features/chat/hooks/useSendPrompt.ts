import { useCallback, useRef } from 'react';

import { refreshConversation } from '../api/conversationApi';
import { requestReply } from '../api/requestReply';
import { useChatStore } from '../store/chatStore';

import { ApiError } from '@/shared/api/client';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { refreshUsageSnapshot } from '@/shared/usage';

/*
 * The send-and-receive orchestration that the conversation screen needs.
 *
 * This used to live inline in both `FreshProjectChatContent` and
 * `ConversationContent`, and the two drifted slightly -- the abort controller
 * was a real piece of state in one and a manual `replyControllerRef` in the
 * other, and the "aborted but still resolved" race was a TODO in both. A
 * single hook freezes the contract.
 *
 * Contract:
 *   - Each call to `onSend` aborts the previous in-flight reply (if any), so a
 *     new prompt always wins over a stale one.
 *   - The resolved reply is only filed if THIS controller is still the active
 *     one. A late resolve that's already been aborted is dropped silently.
 *   - A request survives component unmount because sending the first prompt
 *     replaces the fresh-chat component immediately. The captured conversation
 *     id still pins the eventual reply to the correct chat.
 *   - The `t` dependency is `chat.conversation.error`; using a function in
 *     `useCallback` deps keeps the callback stable across re-renders.
 */
export function useSendPrompt(targetId: string | null) {
  const { t, i18n } = useTranslation();
  const controllerRef = useRef<AbortController | null>(null);

  const onSend = useCallback(
    (message: string) => {
      useChatStore.getState().sendPrompt(message);

      const newActiveId = targetId ?? useChatStore.getState().activeId;
      if (!newActiveId) return;
      const state = useChatStore.getState();
      const conversation = state.conversations.find((item) => item.id === newActiveId);
      const clientMessageId = conversation?.messages.at(-1)?.id;
      if (!clientMessageId) return;

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      requestReply(message, {
        conversationId: newActiveId,
        clientMessageId,
        modelId: conversation?.model ?? state.model,
        responseLanguage: i18n.language.startsWith('ar') ? 'ar' : 'en',
        project: conversation?.project ?? null,
        signal: controller.signal,
      })
        .then((reply) => {
          if (controllerRef.current === controller) {
            useChatStore.getState().receiveReply(newActiveId, reply);
            // Fastify stores the assistant message and its provider token usage
            // before returning 201, so both snapshots are authoritative now.
            // Refresh immediately instead of waiting for an app reload or a
            // visit to the usage dashboard.
            void Promise.allSettled([
              refreshConversation(newActiveId),
              refreshUsageSnapshot(),
            ]);
          }
        })
        .catch((error: unknown) => {
          if (
            controllerRef.current === controller &&
            error instanceof Error &&
            error.name !== 'AbortError'
          ) {
            if (error instanceof ApiError && error.status === 429) {
              refreshUsageSnapshot().catch(() => undefined);
            }
            useChatStore
              .getState()
              .receiveReply(newActiveId, error.message || t('chat.conversation.error'));
          }
        });
    },
    [i18n.language, targetId, t],
  );

  return onSend;
}

export default useSendPrompt;
