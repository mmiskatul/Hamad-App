import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import LoginScreen from '../screens/LoginScreen';
import { useAuthFlowStore } from '../store/authFlowStore';
import { initI18n } from '@/shared/i18n';
import { ThemeProvider, THEMES } from '@/shared/theme';

/*
 * Covers the login screen's copy, its CTAs, the field's error state, and the
 * Continue branch: a registered email → /password, a new email → /verify-email,
 * with the result recorded in the auth-flow store (routes carry no params).
 *
 * The screen is rendered under a `<ThemeProvider mode="dark">` so the palette
 * assertions in the "danger" test resolve to a known adaptive-theme value
 * (the danger token in DARK, since that is the historical brand mode the
 * migration was sourced from). The OnboardingScreen test asserts the same
 * values in light mode to prove the palette flips.
 */

// Router is mocked so we can assert navigation targets without a real navigator.
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockRegisteredEmails = ['user@example.com'];
const mockCheckEmail = jest.fn(async (email: string) => ({
  email,
  registered: mockRegisteredEmails.includes(email.trim().toLowerCase()),
}));
jest.mock('../hooks/useCheckEmail', () => ({
  useCheckEmail: () => ({
    mutateAsync: mockCheckEmail,
    isPending: false,
  }),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={metrics}>
        <ThemeProvider mode="dark">
          <LoginScreen />
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>,
  );
}

/** Flattened style of a rendered element, as a single object. */
function styleOf(el: { props: { style?: unknown } }): Record<string, unknown> {
  const style = el.props.style;
  if (Array.isArray(style)) return Object.assign({}, ...style.flat(Infinity).filter(Boolean));
  return (style ?? {}) as Record<string, unknown>;
}

beforeAll(async () => {
  await initI18n();
});

beforeEach(() => {
  mockPush.mockClear();
  mockCheckEmail.mockClear();
  useAuthFlowStore.setState({ email: null, registered: null, hasHydrated: true });
});

it('renders the header copy and every CTA', () => {
  renderScreen();

  expect(screen.getByText('Log in or sign up')).toBeTruthy();
  expect(screen.getByText('You’ll get smarter responses and can upload files, images and more')).toBeTruthy();
  expect(screen.getByText('Continue')).toBeTruthy();
  expect(screen.getByText('Continue with Google')).toBeTruthy();
  expect(screen.getByText('Continue with Apple')).toBeTruthy();
});

it('shows a danger-coloured error when Continue is tapped with an invalid email', () => {
  renderScreen();

  expect(screen.queryByText('Please enter a valid email address')).toBeNull();

  fireEvent.press(screen.getByTestId('login-continue'));

  const err = screen.getByText('Please enter a valid email address');
  expect(err).toBeTruthy();
  // The palette now flows from the theme; in the DARK mode this test renders
  // under, the danger token is the dark palette's #F3413B.
  expect(styleOf(err).color).toBe(THEMES.dark.color.danger);
  expect(mockPush).not.toHaveBeenCalled();
});

it('clears the error once a valid email is entered', () => {
  renderScreen();

  fireEvent.press(screen.getByTestId('login-continue'));
  expect(screen.getByText('Please enter a valid email address')).toBeTruthy();

  fireEvent.changeText(screen.getByTestId('login-email'), 'user@example.com');
  expect(screen.queryByText('Please enter a valid email address')).toBeNull();
});

it('routes a registered email to /password and stores the flow', async () => {
  renderScreen();

  fireEvent.changeText(screen.getByTestId('login-email'), 'user@example.com');
  fireEvent.press(screen.getByTestId('login-continue'));

  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/password'));
  // No route params — the destination reads the flow from the store.
  expect(useAuthFlowStore.getState()).toMatchObject({
    email: 'user@example.com',
    registered: true,
  });
});

it('routes a new email to /verify-email and stores the flow', async () => {
  renderScreen();

  fireEvent.changeText(screen.getByTestId('login-email'), 'new.person@example.com');
  fireEvent.press(screen.getByTestId('login-continue'));

  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/verify-email'));
  expect(useAuthFlowStore.getState()).toMatchObject({
    email: 'new.person@example.com',
    registered: false,
  });
});

it('prefills the email field from a persisted flow', () => {
  useAuthFlowStore.setState({
    email: 'resumed@example.com',
    registered: true,
    hasHydrated: true,
  });

  renderScreen();

  expect(screen.getByTestId('login-email').props.value).toBe('resumed@example.com');
});

it('starts empty when there is no persisted flow', () => {
  renderScreen();

  expect(screen.getByTestId('login-email').props.value).toBe('');
});

it('leaves the store untouched when the email is invalid', () => {
  renderScreen();

  fireEvent.press(screen.getByTestId('login-continue'));

  expect(useAuthFlowStore.getState().email).toBeNull();
  expect(mockPush).not.toHaveBeenCalled();
});
