import { isEmailRegistered } from './localAccounts';

/*
 * Email-existence check used by the login screen's Continue button to branch:
 *   registered     → /password     (enter password to log in)
 *   NOT registered → /verify-email (OTP, then set a password → sign-up done)
 *
 * STUB — there is no backend yet. "Registered" now means the email is in the
 * LOCAL account list (localAccounts.ts), which the sign-up flow writes to when
 * it completes. So the app behaves like a real one across runs: a brand-new
 * address goes to verification, and once that address has finished sign-up it
 * goes to the password screen instead.
 *
 * REPLACES the earlier heuristic (local part containing "new" ⇒ unregistered),
 * which no user action could change.
 *
 * The simulated latency stays deliberately: it keeps the Continue button's
 * loading state honest in development instead of only in production.
 *
 * TODO(backend): replace the body with a real call to the auth module's
 * `POST /auth/check-email` (or equivalent) via the shared API client, keeping
 * this signature so the hook/screen don't change.
 */
export type EmailCheckResult = {
  email: string;
  registered: boolean;
};

const SIMULATED_LATENCY_MS = 400;

export async function checkEmailRegistered(email: string): Promise<EmailCheckResult> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));

  return { email, registered: await isEmailRegistered(email) };
}
