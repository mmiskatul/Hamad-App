import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import PasswordScreen from '../screens/PasswordScreen';
import { useAuthFlowStore } from '../store/authFlowStore';
import { initI18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme';

/*
 * Password screen: copy renders, the eye toggle flips the field between masked
 * and revealed (its a11y label is the observable proxy for that state), the back
 * button POPS rather than pushing a duplicate route onto the stack, and the
 * AuthFlowGate contract holds (no flow ⇒ back to /login, unhydrated ⇒ shell).
 *
 * The screen is rendered under a `<ThemeProvider>` so the palette resolves
 * through the same path as the production layout — even though these tests do
 * not assert specific colours, the (auth)/_layout provider is mounted
 * identically to the (app) group in production, and the screen should work
 * the same way under either.
 */

// Router is mocked so navigation intent is assertable without a real navigator.
const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRedirect = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
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
        <PasswordScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeAll(async () => {
  await initI18n();
});

beforeEach(() => {
  mockBack.mockClear();
  mockPush.mockClear();
  mockReplace.mockClear();
  mockRedirect.mockClear();
  mockCanGoBack = true;
  // The screen is only reachable mid-flow, so the default fixture is a hydrated
  // store holding a registered email — what the login screen would have written.
  useAuthFlowStore.setState({
    email: 'user@example.com',
    registered: true,
    hasHydrated: true,
  });
});

it('renders the title, field and actions', () => {
  renderScreen();

  expect(screen.getByText('Enter your password to login to your account')).toBeTruthy();
  expect(screen.getByText('Forgot your password?')).toBeTruthy();
  expect(screen.getByText('Login')).toBeTruthy();
  expect(screen.getByTestId('password-input')).toBeTruthy();
});

it('toggles password visibility via the eye button', () => {
  renderScreen();

  const input = screen.getByTestId('password-input');
  // Masked by default.
  expect(input.props.secureTextEntry).toBe(true);

  // The toggle exposes a "Show password" label while masked.
  fireEvent.press(screen.getByLabelText('Show password'));
  expect(input.props.secureTextEntry).toBe(false);

  // Now it offers to hide again.
  fireEvent.press(screen.getByLabelText('Hide password'));
  expect(input.props.secureTextEntry).toBe(true);
});

it('pops the stack on back instead of pushing another route', () => {
  renderScreen();

  fireEvent.press(screen.getByTestId('password-back'));

  expect(mockBack).toHaveBeenCalledTimes(1);
  // The regression this guards: pushing /login here would stack a second copy
  // of the login screen on top of the one already below.
  expect(mockPush).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});

it('logs in: clears the flow and replaces the route with /home', () => {
  renderScreen();

  fireEvent.changeText(screen.getByTestId('password-input'), 'sup3rsecret');
  fireEvent.press(screen.getByTestId('password-submit'));

  // Replace, not push: the auth stack must not sit under the app.
  expect(mockReplace).toHaveBeenCalledWith('/home');
  expect(mockPush).not.toHaveBeenCalled();
  expect(useAuthFlowStore.getState().email).toBeNull();
});

it('does not navigate when the password field is empty', () => {
  renderScreen();

  fireEvent.press(screen.getByTestId('password-submit'));

  expect(mockReplace).not.toHaveBeenCalled();
});

it('redirects to /login when opened with no flow in the store', () => {
  useAuthFlowStore.setState({ email: null, registered: null, hasHydrated: true });

  renderScreen();

  expect(mockRedirect).toHaveBeenCalledWith('/login');
  // The form must not render at all — it could never be submitted.
  expect(screen.queryByTestId('password-input')).toBeNull();
});

it('shows the backdrop shell — not the form, not a spinner — before hydration', () => {
  useAuthFlowStore.setState({ email: null, registered: null, hasHydrated: false });

  renderScreen();

  expect(screen.getByTestId('auth-flow-shell')).toBeTruthy();
  expect(screen.queryByTestId('password-input')).toBeNull();
  // Crucially it does NOT redirect yet: the store may still be reading a stored
  // flow off disk, and bouncing a returning user to /login would be wrong.
  expect(mockRedirect).not.toHaveBeenCalled();
});

it('replaces with /login when there is no history to pop (deep link)', () => {
  mockCanGoBack = false;
  renderScreen();

  fireEvent.press(screen.getByTestId('password-back'));

  expect(mockReplace).toHaveBeenCalledWith('/login');
  expect(mockBack).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});
