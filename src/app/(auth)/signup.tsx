import { SignupScreen } from '@/features/auth';

/*
 * "/signup" — "Finish signing up": name + password, reached from /verify-email
 * once a sign-up OTP is accepted. Thin route binding; the screen lives in the
 * auth feature and reads the verified email from the auth-flow store (no params).
 */
export default SignupScreen;
