import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/*
 * Memory (Figma 185:3164 settings, 187:824 summary): the personalisation
 * profile the assistant is allowed to carry between chats.
 *
 * Owned by features/settings rather than shared/ — deliberately, and unlike the
 * plan and usage stores. Nothing else in the app reads it: the assistant will
 * receive it from the SERVER as part of the request context, not from another
 * screen. Promote it only when a second feature genuinely needs it.
 *
 * `enabled` gates the whole feature, and the fields keep their values while it
 * is off rather than being cleared: switching memory off is "stop using this",
 * and a user who toggles it back on within the same session would otherwise
 * find their profile silently destroyed. Deleting is a separate, explicit
 * action on the summary screen.
 *
 * PRIVACY: this is unencrypted disk, same as every other persisted store here.
 * It holds self-described profile text, which the user typed knowingly — no
 * credentials, tokens or OTP codes may ever be added to it.
 *
 * TODO(backend): memory belongs to the account; this store becomes the cache of
 * a profile endpoint, and `summary` is server-generated rather than local.
 */
export const MEMORY_STORAGE_KEY = 'oneai.memory';

export type MemoryState = {
  enabled: boolean;
  nickname: string;
  occupation: string;
  /** Free-form "More about you" (Figma 187:821, a 208pt editor). */
  about: string;
  /** The assistant's rolling summary, shown on 187:824. */
  summary: string;
  /** Epoch ms of the last summary change — the header's "UPDATED …" line. */
  summaryUpdatedAt: number | null;
  hasHydrated: boolean;

  setEnabled: (enabled: boolean) => void;
  setProfile: (patch: Partial<Pick<MemoryState, 'nickname' | 'occupation' | 'about'>>) => void;
  /** Appends a note to the summary (the "Add or update" composer). */
  appendSummary: (text: string) => void;
  clearSummary: () => void;
};

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      enabled: false,
      nickname: '',
      occupation: '',
      about: '',
      summary: '',
      summaryUpdatedAt: null,
      hasHydrated: false,

      setEnabled: (enabled) => set({ enabled }),

      setProfile: (patch) => set(patch),

      appendSummary: (text) => {
        const trimmed = text.trim();
        // An empty note would still bump "UPDATED …", which would read as the
        // assistant having learned something when it has not.
        if (!trimmed) return;

        const current = get().summary;
        set({
          summary: current ? `${current}\n\n${trimmed}` : trimmed,
          summaryUpdatedAt: Date.now(),
        });
      },

      clearSummary: () => set({ summary: '', summaryUpdatedAt: null }),
    }),
    {
      name: MEMORY_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ enabled, nickname, occupation, about, summary, summaryUpdatedAt }) => ({
        enabled,
        nickname,
        occupation,
        about,
        summary,
        summaryUpdatedAt,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error && __DEV__) {
          console.warn('[memoryStore] rehydrate failed:', error);
        }
        useMemoryStore.setState({ hasHydrated: true });
      },
    },
  ),
);

export default useMemoryStore;
