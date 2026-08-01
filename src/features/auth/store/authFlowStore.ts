import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/*
 * Auth-flow store — the branch state produced by the login screen's email check.
 *
 * WHAT IT OWNS (deliberately small, user decision 2026-07-21):
 *   email      — the address currently being authenticated
 *   registered — what checkEmailRegistered answered for it:
 *                  true  → /password     (log in)
 *                  false → /verify-email (OTP, start sign-up)
 * Nothing else. Passwords and OTP codes are NEVER put in here: this store is
 * persisted to plain (unencrypted) AsyncStorage, so it may only hold data we are
 * willing to leave on disk. Real credentials/tokens go to react-native-keychain
 * when the backend lands (tracker FUTURE #8).
 *
 * WHY A STORE AND NOT ROUTE PARAMS (user decision): /password and /verify-email
 * used to receive `email` as a route param. Two screens then had two sources of
 * truth for the same value and a deep link could open /password with no email at
 * all. Now the store is the single source: the screens read it, and a route
 * reached without flow state redirects back to /login instead of rendering a form
 * that cannot submit.
 *
 * PERSISTENCE (user decision): survives app restarts, so killing the app
 * mid-flow and reopening resumes where it left off. It is cleared by clearFlow()
 * — on completed auth — and overwritten
 * whenever startFlow() runs for a new email.
 *
 * HYDRATION IS ASYNC. AsyncStorage is a native round-trip, so on the very first
 * frame `email` is null even when a flow IS stored. Anything that branches on
 * this state must wait for `hasHydrated` (see AuthFlowGate), or it will bounce a
 * returning user back to /login. useAppBootstrap awaits whenAuthFlowHydrated()
 * before leaving the splash, so on the normal path hydration is long finished
 * before any auth route mounts; the gate covers deep links, which skip "/".
 */
export const AUTH_FLOW_STORAGE_KEY = 'oneai.auth.flow';

/* Fail-open budget for hydration — see whenAuthFlowHydrated below. */
const HYDRATION_TIMEOUT_MS = 3000;

/*
 * WHY THE FLOW ALSO CARRIES AN INTENT: one OTP screen serves two journeys. The
 * verification step is pixel-identical in the design (Figma 135:1062 for sign-up,
 * 135:2093 for a password reset) and behaves identically — only where it hands
 * off differs. Duplicating the screen to encode that would give us two copies of
 * an OTP input to keep in sync; the intent is the one bit that actually varies.
 *
 *   signup → /signup        (name + password, creates the account)
 *   reset  → /new-password  (set a replacement, account already exists)
 */
export type AuthIntent = 'signin' | 'signup' | 'reset';

export type AuthFlowState = {
  /** Email being authenticated; null when no flow is in progress. */
  email: string | null;
  /** Whether that email has an account. null when unknown / no flow. */
  registered: boolean | null;
  /** What the user is trying to do. null when no flow is in progress. */
  intent: AuthIntent | null;
  /** One-time registration proof. Runtime-only; never written to AsyncStorage. */
  verificationToken: string | null;
  /** False until the persisted value has been read back from AsyncStorage. */
  hasHydrated: boolean;
  /** Record the email-check result and start (or restart) the flow. */
  startFlow: (input: { email: string; registered: boolean }) => void;
  /** Switch the running flow to a password reset (the "Forgot?" link). */
  startReset: () => void;
  /** Keep the server's one-time registration proof in memory for /signup. */
  setVerificationToken: (token: string) => void;
  /** Drop the flow — call on completed auth or when abandoning sign-in. */
  clearFlow: () => void;
};

export const useAuthFlowStore = create<AuthFlowState>()(
  persist(
    (set) => ({
      email: null,
      registered: null,
      intent: null,
      verificationToken: null,
      hasHydrated: false,
      startFlow: ({ email, registered }) =>
        // The intent follows from the answer: a known address is signing in, an
        // unknown one is signing up. Callers never have to pass it.
        set({
          email,
          registered,
          intent: registered ? 'signin' : 'signup',
          verificationToken: null,
        }),
      startReset: () => set({ intent: 'reset', verificationToken: null }),
      setVerificationToken: (verificationToken) => set({ verificationToken }),
      clearFlow: () =>
        set({ email: null, registered: null, intent: null, verificationToken: null }),
    }),
    {
      name: AUTH_FLOW_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      // hasHydrated is runtime-only — persisting it would restore `true` before
      // the read that is supposed to set it has happened.
      partialize: ({ email, registered, intent }) => ({ email, registered, intent }),
      // Fires on success AND on error; on error `state` is undefined, which is
      // why the flag is set through the store rather than the callback argument.
      // A storage failure must still flip the flag: an unreadable store means
      // "no flow", not "wait forever".
      onRehydrateStorage: () => (state, error) => {
        // Always advance the flag — the hydration attempt has ended either way,
        // and a hung splash is the worst-case outcome. A loaded `state` is the
        // success path; an error or an undefined state is the failure path, and
        // both must release the gate.
        if (error && __DEV__) {
          console.warn('[authFlowStore] rehydrate failed:', error);
        }
        useAuthFlowStore.setState({ hasHydrated: true });
      },
    },
  ),
);

/*
 * Resolves once the persisted flow has been read back (or the read has failed).
 *
 * Used as a bootstrap task so the splash absorbs the storage round-trip. It is
 * FAIL-OPEN in the same spirit as useAssetPreload: if AsyncStorage never answers,
 * HYDRATION_TIMEOUT_MS flips the flag anyway and the app proceeds with an empty
 * flow. A hung splash — or a screen stuck on its shell — is worse than losing a
 * remembered email.
 */
export function whenAuthFlowHydrated(): Promise<void> {
  if (useAuthFlowStore.getState().hasHydrated) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      unsubscribe();
      resolve();
    };

    const timer = setTimeout(() => {
      useAuthFlowStore.setState({ hasHydrated: true });
      finish();
    }, HYDRATION_TIMEOUT_MS);

    const unsubscribe = useAuthFlowStore.subscribe((state) => {
      if (state.hasHydrated) finish();
    });
  });
}

export default useAuthFlowStore;
