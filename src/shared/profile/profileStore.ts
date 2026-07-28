import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/*
 * The signed-in user's identity as the UI displays it: name, email, avatar.
 *
 * In shared/ for the same reason as shared/plan — it is an ACCOUNT fact, and it
 * already has two readers in different features (settings' Profile screens and
 * chat's drawer account pill), which may not import each other.
 *
 * Before this store the drawer rendered its name from an i18n string
 * (`chat.drawer.accountName`), which made a person's name a translatable
 * constant — wrong in every language.
 *
 * TODO(backend): the profile belongs to the session endpoint; this store then
 * caches it (TanStack Query) and `saveProfile` becomes a PATCH. Nothing here is
 * a credential, so AsyncStorage is the right home — passwords and tokens go to
 * react-native-keychain (mobile/CLAUDE.md).
 */
export const PROFILE_STORAGE_KEY = 'oneai.profile';

export type Profile = {
  name: string;
  email: string;
  /** Local file URI or remote URL; null renders the initial-letter fallback. */
  avatarUri: string | null;
  /** E.164 or display-formatted phone. Empty string when not set. */
  phone: string;
};

export type ProfileState = Profile & {
  hasHydrated: boolean;
  /** Merge a partial edit (the edit screen submits name + email only). */
  saveProfile: (patch: Partial<Profile>) => void;
};

/*
 * Seeded from the Figma mock so the screens have something to render before the
 * backend exists. Replace with empty strings the moment the session endpoint
 * lands — a fake name shown to a real user is worse than a blank one.
 *
 * TODO(backend-session): ticket MUST land before any production / EAS build
 * submission. The seeded name and email are visible in the chat drawer and
 * profile screen — if users download a build that still shows
 * "Mahfuzur Rahman / example@gmail.com" we'll have to push a hotfix.
 * Also tied to PROGRESS.md "Action item for backend integration" — when auth
 * lands, session/profile/keychain all move together.
 */
const MOCK_PROFILE: Profile = {
  name: 'Mahfuzur Rahman',
  email: 'example@gmail.com',
  avatarUri: null,
  phone: '+880 1711 234 567',
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      ...MOCK_PROFILE,
      hasHydrated: false,
      saveProfile: (patch) => set(patch),
    }),
    {
      name: PROFILE_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ name, email, avatarUri, phone }) => ({ name, email, avatarUri, phone }),
      onRehydrateStorage: () => (state, error) => {
        if (error && __DEV__) {
          console.warn('[profileStore] rehydrate failed:', error);
        }
        useProfileStore.setState({ hasHydrated: true });
      },
    },
  ),
);

/** First letter of the name, for the avatar fallback. Empty name → "?". */
export function profileInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export default useProfileStore;
