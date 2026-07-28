import { NewPasswordScreen } from '@/features/auth';

/*
 * "/new-password" — set a password, the final step of sign-up. Reached from
 * /verify-email once the OTP is accepted. Thin route binding; the screen lives
 * in the auth feature and reads the email from the auth-flow store (no params).
 */
export default NewPasswordScreen;
