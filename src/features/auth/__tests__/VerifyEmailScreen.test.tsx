import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import { useAuthFlowStore } from '../store/authFlowStore';
import { initI18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme';

/*
 * Verify-email screen: copy renders, the OTP input accepts up to 4 digits (and
 * strips non-digits), Verify is disabled until the code is complete, and the
 * screen is unreachable without an auth flow in the store.
 *
 * Rendered under `<ThemeProvider mode="dark">` so the palette resolves
 * through the same path as the production (auth) layout.
 */

const mockRedirect = jest.fn();
const mockPush = jest.fn();
const mockRequestRegistrationCode = jest.fn();
const mockVerifyRegistrationCode = jest.fn();
jest.mock('../api/registration', () => ({
  requestRegistrationCode: (...args: unknown[]) => mockRequestRegistrationCode(...args),
  verifyRegistrationCode: (...args: unknown[]) => mockVerifyRegistrationCode(...args),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(href);
    return null;
  },
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider mode="dark">
        <VerifyEmailScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

/** Flattened accessibilityState of an element. */
function a11yStateOf(el: { props: { accessibilityState?: Record<string, unknown> } }) {
  return el.props.accessibilityState ?? {};
}

beforeAll(async () => {
  await initI18n();
});

beforeEach(() => {
  mockRedirect.mockClear();
  mockPush.mockClear();
  mockRequestRegistrationCode.mockReset();
  mockRequestRegistrationCode.mockResolvedValue({ sent: true });
  mockVerifyRegistrationCode.mockReset();
  mockVerifyRegistrationCode.mockResolvedValue({
    verificationToken: 'verified-registration-token',
  });
  // Reached only mid-sign-up: an unregistered email, as login would have stored.
  useAuthFlowStore.setState({
    email: 'new.person@example.com',
    registered: false,
    verificationToken: null,
    hasHydrated: true,
  });
});

it('renders the title, subtitle and resend line', () => {
  renderScreen();

  expect(screen.getByText('Verification required')).toBeTruthy();
  expect(screen.getByText('Enter the verification code sent to your email address')).toBeTruthy();
  expect(screen.getByText('Resend code')).toBeTruthy();
});

it('keeps Verify disabled until 4 digits are entered', () => {
  renderScreen();

  const verify = screen.getByTestId('verify-submit');
  expect(a11yStateOf(verify).disabled).toBe(true);

  // OTP input is labelled with the screen title; type a full code.
  const otp = screen.getByLabelText('Verification required');
  fireEvent.changeText(otp, '1234');

  expect(a11yStateOf(screen.getByTestId('verify-submit')).disabled).toBe(false);
});

it('ignores non-digits and caps the code at 4 characters', () => {
  renderScreen();

  const otp = screen.getByLabelText('Verification required');
  fireEvent.changeText(otp, '12ab');
  // Non-digits stripped → only "12" kept → still incomplete.
  expect(a11yStateOf(screen.getByTestId('verify-submit')).disabled).toBe(true);

  fireEvent.changeText(otp, '123456');
  // Capped to 4 → complete.
  expect(a11yStateOf(screen.getByTestId('verify-submit')).disabled).toBe(false);
});

it('a verified SIGN-UP code stores the server proof and goes on to finish signing up', async () => {
  useAuthFlowStore.setState({ intent: 'signup' });
  renderScreen();

  fireEvent.changeText(screen.getByLabelText('Verification required'), '1234');
  fireEvent.press(screen.getByTestId('verify-submit'));

  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/signup'));
  expect(mockVerifyRegistrationCode).toHaveBeenCalledWith(
    'new.person@example.com',
    '1234',
  );
  expect(useAuthFlowStore.getState().verificationToken).toBe('verified-registration-token');
});

/*
 * Same screen, same code, different exit — this is the whole reason the flow
 * carries an intent instead of the reset journey owning a second OTP screen.
 */
it('a verified RESET code goes on to set a new password', () => {
  useAuthFlowStore.setState({ intent: 'reset' });
  renderScreen();

  fireEvent.changeText(screen.getByLabelText('Verification required'), '1234');
  fireEvent.press(screen.getByTestId('verify-submit'));

  expect(mockPush).toHaveBeenCalledWith('/new-password');
});

it('does not navigate while the code is incomplete', () => {
  renderScreen();

  fireEvent.changeText(screen.getByLabelText('Verification required'), '12');
  fireEvent.press(screen.getByTestId('verify-submit'));

  expect(mockPush).not.toHaveBeenCalled();
});

it('redirects to /login when opened with no flow in the store', () => {
  useAuthFlowStore.setState({ email: null, registered: null, hasHydrated: true });

  renderScreen();

  expect(mockRedirect).toHaveBeenCalledWith('/login');
  expect(screen.queryByTestId('verify-submit')).toBeNull();
});
