import { PasswordScreen } from '@/features/auth';

/*
 * "/password" — enter-password-to-log-in screen, reached from /login's Continue
 * when the email belongs to an existing account. Thin route binding; the screen
 * lives in the auth feature and is exported through its index.ts. Receives the
 * `email` route param.
 */
export default PasswordScreen;
