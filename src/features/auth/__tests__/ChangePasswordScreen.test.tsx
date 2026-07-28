import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import { MIN_PASSWORD_LENGTH } from '../screens/NewPasswordScreen';
import { initI18n } from '@/shared/i18n';
import { ThemeProvider } from '@/shared/theme';

/*
 * Change password (Figma 140:1935), opened from the profile's Password row.
 *
 * The rules worth pinning: the current password is required (otherwise an
 * unlocked phone is enough to take over the account), the new one must be long
 * enough, must match its confirmation, and must actually be DIFFERENT — a no-op
 * change that reports success is the failure mode this screen is most likely to
 * ship with. Plus the ✕: the user opted into this screen and must be able to
 * leave it without committing to anything.
 *
 * Rendered under `<ThemeProvider mode="dark">` so the palette resolves through
 * the same path as the production (auth) layout.
 */

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn(() => true);
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack(),
  }),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const CURRENT = 'oldpassword1';
const VALID = 'sup3rsecret';

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider mode="dark">
        <ChangePasswordScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

function fill(current: string, password: string, confirm: string) {
  fireEvent.changeText(screen.getByTestId('current-password-input'), current);
  fireEvent.changeText(screen.getByTestId('change-new-password-input'), password);
  fireEvent.changeText(screen.getByTestId('change-confirm-password-input'), confirm);
}

beforeAll(async () => {
  await initI18n();
});

beforeEach(() => {
  mockBack.mockClear();
  mockReplace.mockClear();
  mockCanGoBack.mockReturnValue(true);
});

it('renders the three fields from the design', () => {
  renderScreen();

  expect(screen.getByText('Change password')).toBeTruthy();
  expect(screen.getByTestId('current-password-input')).toBeTruthy();
  expect(screen.getByTestId('change-new-password-input')).toBeTruthy();
  expect(screen.getByTestId('change-confirm-password-input')).toBeTruthy();
});

it('refuses to submit without the current password', () => {
  renderScreen();

  fill('', VALID, VALID);
  fireEvent.press(screen.getByTestId('change-password-submit'));

  expect(screen.getByText('Enter your current password')).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
});

it('refuses a short password and a mismatched confirmation', () => {
  renderScreen();

  fill(CURRENT, 'short', 'short');
  fireEvent.press(screen.getByTestId('change-password-submit'));
  expect(screen.getByText(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`)).toBeTruthy();

  fill(CURRENT, VALID, 'different');
  fireEvent.press(screen.getByTestId('change-password-submit'));
  expect(screen.getByText('Passwords do not match')).toBeTruthy();

  expect(mockBack).not.toHaveBeenCalled();
});

it('refuses a "new" password identical to the current one', () => {
  renderScreen();

  fill(CURRENT, CURRENT, CURRENT);
  fireEvent.press(screen.getByTestId('change-password-submit'));

  expect(screen.getByText('New password must be different from the current one')).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
});

it('leaves the screen once a valid change is submitted', async () => {
  renderScreen();

  fill(CURRENT, VALID, VALID);
  fireEvent.press(screen.getByTestId('change-password-submit'));

  await waitFor(() => expect(mockBack).toHaveBeenCalled());
});

it('the ✕ leaves without changing anything', () => {
  renderScreen();

  fill(CURRENT, VALID, VALID);
  fireEvent.press(screen.getByTestId('change-password-close'));

  expect(mockBack).toHaveBeenCalled();
});

it('the ✕ falls back to /profile when there is nothing to pop', () => {
  mockCanGoBack.mockReturnValue(false);
  renderScreen();

  fireEvent.press(screen.getByTestId('change-password-close'));

  // Replace, never push — a deep link here must not stack a second profile.
  expect(mockReplace).toHaveBeenCalledWith('/profile');
  expect(mockBack).not.toHaveBeenCalled();
});
