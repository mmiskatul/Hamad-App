import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SignupScreen from '../screens/SignupScreen';
import { MIN_PASSWORD_LENGTH } from '../screens/NewPasswordScreen';
import { clearAccounts, isEmailRegistered } from '../api/localAccounts';
import { useAuthFlowStore } from '../store/authFlowStore';
import { initI18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme';

/*
 * "Finish signing up" (Figma 135:1175) — the step that actually creates the
 * account. What matters here: the verified email is shown but NOT editable (the
 * code went to that address, so the account must be created for it), and Create
 * Account writes the registry entry that flips this email to the /password
 * branch on its next login.
 *
 * Rendered under `<ThemeProvider mode="dark">` so the palette resolves through
 * the same path as the production (auth) layout.
 */

const mockReplace = jest.fn();
const mockRedirect = jest.fn();
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
        <SignupScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

function fill(name: string, password: string) {
  fireEvent.changeText(screen.getByTestId('signup-name-input'), name);
  fireEvent.changeText(screen.getByTestId('signup-password-input'), password);
}

beforeAll(async () => {
  await initI18n();
});

beforeEach(async () => {
  mockReplace.mockClear();
  mockRedirect.mockClear();
  await clearAccounts();
  useAuthFlowStore.setState({
    email: EMAIL,
    registered: false,
    intent: 'signup',
    hasHydrated: true,
  });
});

it('renders the form with the verified email filled in and locked', () => {
  renderScreen();

  expect(screen.getByText('Finish signing up')).toBeTruthy();

  const emailField = screen.getByTestId('signup-email-input');
  expect(emailField.props.value).toBe(EMAIL);
  // Editable would mean creating an account for an address nobody verified.
  expect(emailField.props.editable).toBe(false);
});

it('refuses an empty name', () => {
  renderScreen();

  fill('', VALID);
  fireEvent.press(screen.getByTestId('signup-submit'));

  expect(screen.getByText('Please enter your name')).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});

it('refuses a password under the minimum length', () => {
  renderScreen();

  fill('Sam Rivera', 'short');
  fireEvent.press(screen.getByTestId('signup-submit'));

  expect(screen.getByText(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)).toBeTruthy();
  expect(mockReplace).not.toHaveBeenCalled();
});

it('creates the account, clears the flow and replaces with /home', async () => {
  renderScreen();

  fill('Sam Rivera', VALID);
  fireEvent.press(screen.getByTestId('signup-submit'));

  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/home'));

  // The registry write is what makes this email take the /password branch on
  // its NEXT login — the whole point of the sign-up step.
  expect(await isEmailRegistered(EMAIL)).toBe(true);
  expect(useAuthFlowStore.getState().email).toBeNull();
});

it('redirects to /login when opened with no flow in the store', () => {
  useAuthFlowStore.setState({ email: null, registered: null, intent: null, hasHydrated: true });

  renderScreen();

  expect(mockRedirect).toHaveBeenCalledWith('/login');
  expect(screen.queryByTestId('signup-name-input')).toBeNull();
});
