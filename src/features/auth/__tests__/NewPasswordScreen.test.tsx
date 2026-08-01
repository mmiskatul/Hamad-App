import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import NewPasswordScreen, { MIN_PASSWORD_LENGTH } from '../screens/NewPasswordScreen';
import { useAuthFlowStore } from '../store/authFlowStore';
import { initI18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme';

/*
 * New password screen — the last step of a PASSWORD RESET. The behaviour that
 * matters is the hand-off: Done clears the flow and REPLACES the route with
 * /login, so the reset ends by signing in with the new password and Back cannot
 * walk into a spent OTP screen. It must NOT touch the account registry — a reset
 * changes an account that already exists (that write belongs to sign-up).
 *
 * Rendered under `<ThemeProvider mode="dark">` so the palette resolves through
 * the same path as the production (auth) layout.
 */

const mockReplace = jest.fn();
const mockRedirect = jest.fn();
const mockResetPassword = jest.fn();
jest.mock('../api/passwordReset', () => ({
  resetPassword: (...args: unknown[]) => mockResetPassword(...args),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const EMAIL = 'new.person@example.com';
const VALID = 'sup3rsecret';

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider mode="dark">
        <NewPasswordScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

function fillBoth(password: string, confirm: string) {
  fireEvent.changeText(screen.getByTestId('new-password-input'), password);
  fireEvent.changeText(screen.getByTestId('confirm-password-input'), confirm);
}

beforeAll(async () => {
  await initI18n();
});

beforeEach(() => {
  mockReplace.mockClear();
  mockRedirect.mockClear();
  mockResetPassword.mockReset();
  mockResetPassword.mockResolvedValue(undefined);
  useAuthFlowStore.setState({
    email: EMAIL,
    registered: true,
    intent: 'reset',
    verificationToken: 'verified-reset-token',
    hasHydrated: true,
  });
});

it('renders the Figma copy and both fields', () => {
  renderScreen();

  expect(screen.getByText('New password')).toBeTruthy();
  expect(screen.getByText('Set your new password to continue')).toBeTruthy();
  expect(screen.getByTestId('new-password-input')).toBeTruthy();
  expect(screen.getByTestId('confirm-password-input')).toBeTruthy();
  expect(screen.getByText('Done')).toBeTruthy();
});

it('rejects a password shorter than the minimum', async () => {
  renderScreen();

  fillBoth('short', 'short');
  fireEvent.press(screen.getByTestId('new-password-submit'));

  expect(screen.getByText(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)).toBeTruthy();
  await waitFor(() => expect(mockReplace).not.toHaveBeenCalled());
});

it('rejects mismatched passwords', async () => {
  renderScreen();

  fillBoth(VALID, `${VALID}x`);
  fireEvent.press(screen.getByTestId('new-password-submit'));

  expect(screen.getByText('Passwords do not match')).toBeTruthy();
  await waitFor(() => expect(mockReplace).not.toHaveBeenCalled());
});

it('clears the error once the user starts correcting it', () => {
  renderScreen();

  fillBoth(VALID, 'different');
  fireEvent.press(screen.getByTestId('new-password-submit'));
  expect(screen.getByText('Passwords do not match')).toBeTruthy();

  fireEvent.changeText(screen.getByTestId('confirm-password-input'), VALID);
  expect(screen.queryByText('Passwords do not match')).toBeNull();
});

it('clears the flow and replaces with /login, leaving the registry alone', async () => {
  renderScreen();

  fillBoth(VALID, VALID);
  fireEvent.press(screen.getByTestId('new-password-submit'));

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));

  expect(mockResetPassword).toHaveBeenCalledWith({
    email: EMAIL,
    password: VALID,
    resetToken: 'verified-reset-token',
  });

  // Resetting a password must not create an account — that is sign-up's job.
  expect(useAuthFlowStore.getState().email).toBeNull();
});

it('keeps the reset flow available when the backend rejects the reset proof', async () => {
  mockResetPassword.mockRejectedValueOnce(new Error('expired proof'));
  renderScreen();

  fillBoth(VALID, VALID);
  fireEvent.press(screen.getByTestId('new-password-submit'));

  expect(
    await screen.findByText(
      "We couldn't reset your password. Verify the code again and retry.",
    ),
  ).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(useAuthFlowStore.getState().email).toBe(EMAIL);
});

it('returns to verification when the reset proof is missing', () => {
  useAuthFlowStore.setState({ verificationToken: null });

  renderScreen();

  expect(mockRedirect).toHaveBeenCalledWith('/verify-email');
  expect(screen.queryByTestId('new-password-input')).toBeNull();
});

it('redirects to /login when opened with no flow in the store', () => {
  useAuthFlowStore.setState({ email: null, registered: null, hasHydrated: true });

  renderScreen();

  expect(mockRedirect).toHaveBeenCalledWith('/login');
  expect(screen.queryByTestId('new-password-input')).toBeNull();
});
