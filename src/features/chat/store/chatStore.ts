import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_MODEL, type ModelId } from '../constants';

/*
 * Chat state: the conversation list behind the drawer's Recents, the active
 * conversation, the selected model, and the prompt counter that drives the
 * upsell.
 *
 * PERSISTED (AsyncStorage) so Recents and the model survive a restart, matching
 * how the auth flow already works. `promptCount` and `upsellSeen` are NOT
 * persisted: the "Enjoying using!" nudge is a per-session moment, and reviving a
 * stale counter would fire it at a random point in the next run.
 *
 * TODO(backend): conversations belong to the server once the chat module exists;
 * this store then caches them through TanStack Query rather than owning them.
 * Messages are kept deliberately thin (role + text) for the same reason.
 */
export const CHAT_STORAGE_KEY = 'oneai.chat';
/* Bump with every shape change to Conversation, and add a migrate branch. */
export const CHAT_STORAGE_VERSION = 5;

/* Show the upsell once the user has sent this many prompts in a session. */
export const UPSELL_AFTER_PROMPTS = 2;
/* Recents row label length — the Figma rows are single-line. */
const TITLE_MAX_LENGTH = 40;

export type ChatMessage = {
  /** Stable per message — the transcript keys on it and the reveal tracks it. */
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: number;
  generatedImages?: ChatAttachment[];
  /** The user's rating for an assistant response. Persisted with the transcript. */
  feedback?: 'up' | 'down';
};

/*
 * A file the user attached to a conversation. The MODEL exists ahead of its
 * source: the Files-in-chat screen (Figma 184:2882) is real, but nothing writes
 * to this list until the attachment picker and upload endpoint land, so it is
 * always empty today and the screen shows its empty state.
 */
export type ChatAttachment = {
  id: string;
  name: string;
  at: number;
  /** Local or remote URI. Null until the upload endpoint exists. */
  uri: string | null;
  mimeType: string;
  size: number;
};

/*
 * The project a conversation belongs to, if any (Figma 146:1666 breadcrumb
 * "Project / My project").
 *
 * The NAME is stored alongside the id, denormalised on purpose. Projects live in
 * features/projects and chat may not import another feature, so resolving the id
 * to a label at render time is not available to this module. Copying the label
 * at creation is the alternative that does not bend the architecture; it goes
 * stale if the project is renamed, which is a cosmetic breadcrumb, and the
 * server will own both sides of this the moment the chat module exists.
 */
export type ConversationProject = { id: string; name: string };

export type Conversation = {
  id: string;
  title: string;
  model: ModelId;
  updatedAt: number;
  /** Pinned conversations sort above the rest in Recents. */
  pinned: boolean;
  /** Timestamp when the conversation was pinned, used to order pinned chats by recent pin. */
  pinnedAt?: number;
  /** Null for a plain chat started from the home screen. */
  project: ConversationProject | null;
  messages: ChatMessage[];
  attachments: ChatAttachment[];
};

export type ChatState = {
  conversations: Conversation[];
  /** null = a fresh, unsaved chat (the welcome screen). */
  activeId: string | null;
  model: ModelId;
  /** Prompts sent this session — resets on cold start. */
  promptCount: number;
  upsellSeen: boolean;
  hasHydrated: boolean;

  /*
   * The assistant is composing a reply for this conversation (Figma 144:1314,
   * the THINKING state). Session-only and never persisted: a "thinking" flag
   * restored from disk would show a spinner for a request that died with the
   * previous process and could never resolve.
   */
  thinkingFor: string | null;
  /*
   * The message id whose text should REVEAL word by word. Exactly one at a time,
   * cleared when the reveal finishes — this is what stops the whole transcript
   * replaying its animation on every mount.
   */
  streamingId: string | null;

  /*
   * The project the NEXT new conversation should belong to. Session-only: it is
   * consumed by the first sendPrompt and cleared, so it can never leak into an
   * unrelated chat started later.
   */
  pendingProject: ConversationProject | null;

  /** Append a user prompt, creating the conversation if this is the first one. */
  sendPrompt: (text: string) => void;
  /** Begin a fresh chat scoped to a project (opening a project workspace). */
  startProjectChat: (project: ConversationProject) => void;
  /** Create an empty conversation so a file can be uploaded before the first prompt. */
  createAttachmentConversation: (title: string) => Conversation;
  /** Append the assistant's reply and mark it as the one to reveal. */
  receiveReply: (conversationId: string, text: string) => void;
  setMessageFeedback: (
    conversationId: string,
    messageId: string,
    feedback: 'up' | 'down' | undefined,
  ) => void;
  /** The reveal finished (or was skipped). */
  finishStreaming: () => void;
  /** Park the current conversation and start an empty one. */
  startNewChat: () => void;
  openConversation: (id: string) => void;
  setModel: (model: ModelId) => void;
  markUpsellSeen: () => void;

  /* Row-menu operations (Figma "Menu chat" 183:857 / 185:3294). */
  renameConversation: (id: string, title: string) => void;
  togglePinned: (id: string) => void;
  deleteConversation: (id: string) => void;
  removeAttachment: (conversationId: string, attachmentId: string) => void;
  addAttachment: (conversationId: string, attachment: ChatAttachment) => void;
  replaceAttachments: (conversationId: string, attachments: ChatAttachment[]) => void;
};

/** First line of the prompt, trimmed to a row-sized label. */
function titleFrom(text: string): string {
  const firstLine = text.trim().split('\n')[0] ?? text.trim();
  return firstLine.length > TITLE_MAX_LENGTH
    ? `${firstLine.slice(0, TITLE_MAX_LENGTH - 1).trimEnd()}…`
    : firstLine;
}

function newId(prefix = 'c'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/*
 * Storage migrations, cumulative — a record written at v0 must survive being
 * read at v2, so each branch is applied in turn rather than as an else-if.
 *
 *   v1  added `pinned` and `attachments` to Conversation. Without the backfill
 *       the first `attachments.filter` throws on undefined.
 *   v2  added `id` to ChatMessage. Without it every message keys on `undefined`,
 *       so React reuses the wrong rows, and `streamingId` matches all of them at
 *       once — the entire history would replay the word-by-word reveal.
 *   v3  added `project` to Conversation. Every pre-existing chat was started
 *       from the home screen, so null is the correct backfill, not a guess.
 *
 * Backfilled in ONE place rather than defended at every read site: the shape is
 * honest afterwards. Exported so it is testable without going near AsyncStorage.
 */
export function migrateChatState(persisted: unknown, version: number): unknown {
  const state = persisted as { conversations?: Partial<Conversation>[] } | undefined;
  if (!state?.conversations) return state;

  let conversations = state.conversations;

  if (version < 1) {
    conversations = conversations.map((conversation) => ({
      ...conversation,
      pinned: conversation.pinned ?? false,
      attachments: conversation.attachments ?? [],
    }));
  }

  if (version < 2) {
    conversations = conversations.map((conversation) => ({
      ...conversation,
      messages: (conversation.messages ?? []).map((message, index) => ({
        ...message,
        // Deterministic, so a re-migration of the same record produces the same
        // ids rather than reshuffling React's keys on every launch.
        id: message.id ?? `m_${conversation.id}_${index}`,
      })),
    }));
  }

  if (version < 3) {
    conversations = conversations.map((conversation) => ({
      ...conversation,
      project: conversation.project ?? null,
    }));
  }

  if (version < 4) {
    conversations = conversations.map((conversation) => ({
      ...conversation,
      pinnedAt: conversation.pinned ? conversation.pinnedAt ?? conversation.updatedAt : undefined,
    }));
  }

  if (version < 5) {
    conversations = conversations.map((conversation) => ({
      ...conversation,
      attachments: (conversation.attachments ?? []).map((attachment) => ({
        ...attachment,
        mimeType: attachment.mimeType ?? 'application/octet-stream',
        size: attachment.size ?? 0,
      })),
    }));
  }

  return { ...state, conversations };
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,
      model: DEFAULT_MODEL,
      promptCount: 0,
      upsellSeen: false,
      hasHydrated: false,
      thinkingFor: null,
      streamingId: null,
      pendingProject: null,

      startProjectChat: (project) =>
        set({ activeId: null, streamingId: null, pendingProject: project }),

      createAttachmentConversation: (title) => {
        const now = Date.now();
        const conversation: Conversation = {
          id: newId(),
          title: titleFrom(title || 'New chat'),
          model: get().model,
          updatedAt: now,
          pinned: false,
          project: get().pendingProject,
          messages: [],
          attachments: [],
        };
        set({
          conversations: [conversation, ...get().conversations],
          activeId: conversation.id,
          pendingProject: null,
        });
        return conversation;
      },

      sendPrompt: (text) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const { activeId, conversations, model } = get();
        const message: ChatMessage = {
          id: newId('m'),
          role: 'user',
          text: trimmed,
          at: Date.now(),
        };

        if (activeId) {
          set({
            conversations: conversations.map((conversation) =>
              conversation.id === activeId
                ? {
                    ...conversation,
                    messages: [...conversation.messages, message],
                    updatedAt: message.at,
                  }
                : conversation,
            ),
            promptCount: get().promptCount + 1,
            thinkingFor: activeId,
          });
          return;
        }

        // First prompt of a fresh chat: this is the moment the conversation
        // becomes real and appears in Recents, titled from what was asked.
        const conversation: Conversation = {
          id: newId(),
          title: titleFrom(trimmed),
          model,
          updatedAt: message.at,
          pinned: false,
          // Consumed here — see `pendingProject`.
          project: get().pendingProject,
          messages: [message],
          attachments: [],
        };
        set({
          conversations: [conversation, ...conversations],
          activeId: conversation.id,
          promptCount: get().promptCount + 1,
          thinkingFor: conversation.id,
          pendingProject: null,
        });
      },

      /*
       * TODO(backend): the reply must come from backend/src/ai/routing.service.ts
       * — plan-aware model access plus automatic fallback. The CALLER owns the
       * request; this only files the result, so swapping the stub for the real
       * stream changes nothing here.
       */
      receiveReply: (conversationId, text) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        const message: ChatMessage = {
          id: newId('m'),
          role: 'assistant',
          text: trimmed,
          at: Date.now(),
        };

        set({
          conversations: get().conversations.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  messages: [...conversation.messages, message],
                  updatedAt: message.at,
                }
              : conversation,
          ),
          thinkingFor: null,
          streamingId: message.id,
        });
      },

      setMessageFeedback: (conversationId, messageId, feedback) =>
        set({
          conversations: get().conversations.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  messages: conversation.messages.map((message) =>
                    message.id === messageId && message.role === 'assistant'
                      ? { ...message, feedback }
                      : message,
                  ),
                }
              : conversation,
          ),
        }),

      finishStreaming: () => set({ streamingId: null }),

      // The current chat is ALREADY in `conversations` (sendPrompt put it there),
      // so starting a new one is just clearing the pointer — nothing to archive,
      // and nothing can be lost by tapping this.
      // Leaving a conversation also drops any reveal in progress: coming back
      // to a finished message that is still animating reads as a stuck screen.
      startNewChat: () => set({ activeId: null, streamingId: null, pendingProject: null }),

      openConversation: (id) => set({ activeId: id, streamingId: null }),
      setModel: (model) => {
        const { activeId, conversations } = get();
        set({
          model,
          // When a conversation is open, the model pill controls that
          // conversation. Keep its model in sync so useSendPrompt sends the
          // exact model shown as selected instead of the model used to create
          // the chat.
          conversations: activeId
            ? conversations.map((conversation) =>
                conversation.id === activeId ? { ...conversation, model } : conversation,
              )
            : conversations,
        });
      },
      markUpsellSeen: () => set({ upsellSeen: true }),

      renameConversation: (id, title) => {
        const trimmed = title.trim();
        // An empty title would render a blank Recents row with nothing to tap
        // back to — reject rather than store it.
        if (!trimmed) return;
        set({
          conversations: get().conversations.map((conversation) =>
            conversation.id === id ? { ...conversation, title: titleFrom(trimmed) } : conversation,
          ),
        });
      },

      togglePinned: (id) =>
        set({
          conversations: get().conversations.map((conversation) =>
            conversation.id === id
              ? {
                  ...conversation,
                  pinned: !conversation.pinned,
                  pinnedAt: !conversation.pinned ? Date.now() : undefined,
                }
              : conversation,
          ),
        }),

      deleteConversation: (id) => {
        const { conversations, activeId, thinkingFor } = get();
        set({
          conversations: conversations.filter((conversation) => conversation.id !== id),
          // Deleting the OPEN chat drops the pointer too, otherwise the app
          // holds an activeId nothing resolves to and the next prompt appends
          // to a conversation that no longer exists.
          activeId: activeId === id ? null : activeId,
          // Same for a reply still in flight for it — nothing would ever clear
          // the flag, and the thinking indicator would spin forever.
          thinkingFor: thinkingFor === id ? null : thinkingFor,
          streamingId: null,
        });
      },

      removeAttachment: (conversationId, attachmentId) =>
        set({
          conversations: get().conversations.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  attachments: conversation.attachments.filter(
                    (attachment) => attachment.id !== attachmentId,
                  ),
                }
              : conversation,
          ),
        }),

      addAttachment: (conversationId, attachment) =>
        set({
          conversations: get().conversations.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  attachments: [
                    attachment,
                    ...conversation.attachments.filter((item) => item.id !== attachment.id),
                  ],
                  updatedAt: attachment.at,
                }
              : conversation,
          ),
        }),

      replaceAttachments: (conversationId, attachments) =>
        set({
          conversations: get().conversations.map((conversation) =>
            conversation.id === conversationId ? { ...conversation, attachments } : conversation,
          ),
        }),
    }),
    {
      name: CHAT_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      // Session-only fields are excluded on purpose — see the header.
      partialize: ({ conversations, activeId, model }) => ({ conversations, activeId, model }),
      /*
       * v1 added `pinned` and `attachments` to Conversation. Anything already on
       * disk predates both, so it rehydrates without them and the first
       * `attachments.filter` would throw on undefined. Backfill instead of
       * defending at every read site — one place, and the shape is honest
       * afterwards.
       */
      version: CHAT_STORAGE_VERSION,
      migrate: migrateChatState,
      onRehydrateStorage: () => (state, error) => {
        if (error && __DEV__) {
          console.warn('[chatStore] rehydrate failed:', error);
        }
        useChatStore.setState({ hasHydrated: true });
      },
    },
  ),
);

/*
 * Recents order: pinned first (ordered by most recent pin), then unpinned (ordered by most recent update).
 * Returns a new array — never sort `state.conversations` in place, that mutates
 * the store's own reference and skips the re-render.
 */
export function orderedConversations(conversations: readonly Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.pinned && b.pinned) {
      const aTime = a.pinnedAt ?? a.updatedAt;
      const bTime = b.pinnedAt ?? b.updatedAt;
      return bTime - aTime;
    }
    return b.updatedAt - a.updatedAt;
  });
}

/** True when this prompt count should trigger the upsell (and it is unseen). */
export function shouldShowUpsell(state: Pick<ChatState, 'promptCount' | 'upsellSeen'>): boolean {
  return !state.upsellSeen && state.promptCount >= UPSELL_AFTER_PROMPTS;
}

export default useChatStore;
