import { LoginScreen } from '@/features/auth';

/*
 * "/login" — the login / sign-up screen, reached from onboarding's primary CTA.
 *
 * Thin route binding: maps the URL to the auth feature's public API and holds no
 * UI. The screen lives in the feature module and is exported through its
 * index.ts. It sits in the (auth) group, so the URL is "/login", not
 * "/(auth)/login", and it inherits the group's fixed-dark stack layout.
 */
export default LoginScreen;
