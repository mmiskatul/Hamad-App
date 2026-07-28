import { VerifyEmailScreen } from '@/features/auth';

/*
 * "/verify-email" — OTP screen, reached from /login's Continue when the email is
 * NOT yet registered (start of sign-up). Thin route binding; the screen lives in
 * the auth feature and is exported through its index.ts. Receives the `email`
 * route param (the code was sent to it).
 */
export default VerifyEmailScreen;
