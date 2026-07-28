import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AboutScreen from '../screens/AboutScreen';
import ContactSupportScreen from '../screens/ContactSupportScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TermsScreen from '../screens/TermsScreen';

import { initI18n } from '@/shared/i18n';
import { usePlanStore } from '@/shared/plan';
import { useProfileStore } from '@/shared/profile';
import { THEMES, ThemeProvider, useThemeStore, type ThemeMode } from '@/shared/theme';

/*
 * Settings cluster (Figma 140:1461, 142:877, 140:1726, 140:1968, 140:2044).
 * Covers what the screens PROMISE — plan-aware copy, one open panel, the
 * cancel/save contract, send gating, and the legal empty state — not their
 * pixel layout.
 */

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => true,
  }),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function renderScreen(ui: React.ReactElement, mode: ThemeMode | null = 'dark') {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider mode={mode ?? undefined}>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeAll(async () => {
  await initI18n();
});

beforeEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
  mockReplace.mockClear();
  usePlanStore.setState({ plan: 'free', hasHydrated: true });
  useThemeStore.setState({ preference: 'system', hasHydrated: true });
  useProfileStore.setState({
    name: 'Mahfuzur Rahman',
    email: 'example@gmail.com',
    phone: '+880 1711 234 567',
    avatarUri: null,
    hasHydrated: true,
  });
});

describe('profile hub', () => {
  it('shows the stored identity, not a translated placeholder', () => {
    useProfileStore.setState({
      name: 'Hamad Alkhateri',
      email: 'hamad@oneai.app',
      phone: '+971 50 123 4567',
    });
    renderScreen(<ProfileScreen />);

    expect(screen.getByText('Hamad Alkhateri')).toBeTruthy();
    expect(screen.getByText('hamad@oneai.app')).toBeTruthy();
    expect(screen.getByText('+971 50 123 4567')).toBeTruthy();
  });

  it('renders email and phone on muted pills against the canvas', () => {
    renderScreen(<ProfileScreen />);

    // The email sits inside a `muted` pill — the muted fill is the "muted"
    // semantic, and the text inside stays in textPrimary so it is still
    // legible against the muted fill.
    expect(screen.getByTestId('profile-email-pill').props.style.backgroundColor).toBe(
      THEMES.dark.color.muted,
    );
    expect(screen.getByTestId('profile-phone-pill').props.style.backgroundColor).toBe(
      THEMES.dark.color.muted,
    );
  });

  it('captions the upgrade row with the plan the user is on', () => {
    renderScreen(<ProfileScreen />);
    expect(screen.getByText('Free')).toBeTruthy();
    screen.unmount();

    usePlanStore.setState({ plan: 'business' });
    renderScreen(<ProfileScreen />);
    expect(screen.getByText('Business')).toBeTruthy();
  });

  it('falls back to the name initial when there is no avatar', () => {
    renderScreen(<ProfileScreen />);
    expect(screen.getByText('M')).toBeTruthy();
  });

  it('keeps at most one panel open', () => {
    renderScreen(<ProfileScreen />);

    // Closed: neither panel's controls are mounted.
    expect(screen.queryByTestId('settings-language-toggle')).toBeNull();
    expect(screen.queryByTestId('appearance-dark')).toBeNull();

    fireEvent.press(screen.getByTestId('settings-language'));
    expect(screen.getByTestId('settings-language-toggle')).toBeTruthy();

    // Opening the second closes the first — two open accordions push the tapped
    // row off screen.
    fireEvent.press(screen.getByTestId('settings-appearance'));
    expect(screen.getByTestId('appearance-dark')).toBeTruthy();
    expect(screen.queryByTestId('settings-language-toggle')).toBeNull();

    // Tapping the open row again closes it.
    fireEvent.press(screen.getByTestId('settings-appearance'));
    expect(screen.queryByTestId('appearance-dark')).toBeNull();
  });

  it('writes the appearance choice to the theme store', () => {
    renderScreen(<ProfileScreen />);

    fireEvent.press(screen.getByTestId('settings-appearance'));
    fireEvent.press(screen.getByTestId('appearance-light'));

    expect(useThemeStore.getState().preference).toBe('light');
  });

  it('routes the upgrade and about rows', () => {
    renderScreen(<ProfileScreen />);

    fireEvent.press(screen.getByTestId('settings-upgrade'));
    expect(mockPush).toHaveBeenCalledWith('/upgrade');

    fireEvent.press(screen.getByTestId('settings-about'));
    expect(mockPush).toHaveBeenCalledWith('/about');
  });
});

describe('edit profile', () => {
  it('holds edits locally until Save, so Cancel discards them', () => {
    renderScreen(<EditProfileScreen />);

    fireEvent.changeText(screen.getByTestId('profile-name'), 'Edited Name');
    // Nothing committed yet.
    expect(useProfileStore.getState().name).toBe('Mahfuzur Rahman');

    fireEvent.press(screen.getByTestId('profile-cancel'));
    expect(useProfileStore.getState().name).toBe('Mahfuzur Rahman');
    expect(mockBack).toHaveBeenCalled();
  });

  it('commits on Save and pops back', () => {
    renderScreen(<EditProfileScreen />);

    fireEvent.changeText(screen.getByTestId('profile-name'), '  Hamad  ');
    fireEvent.press(screen.getByTestId('profile-save'));

    expect(useProfileStore.getState().name).toBe('Hamad');
    expect(mockBack).toHaveBeenCalled();
  });

  it('disables Save until something changed, and blocks a blank name', () => {
    renderScreen(<EditProfileScreen />);

    expect(screen.getByTestId('profile-save').props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(screen.getByTestId('profile-name'), '   ');
    // Changed, but invalid — an empty name must not be savable.
    expect(screen.getByTestId('profile-save').props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(screen.getByTestId('profile-name'), 'Hamad');
    expect(screen.getByTestId('profile-save').props.accessibilityState.disabled).toBe(false);
  });

  it('commits the phone number on Save', () => {
    renderScreen(<EditProfileScreen />);

    fireEvent.changeText(screen.getByTestId('profile-phone'), '+971 50 123 4567');
    fireEvent.press(screen.getByTestId('profile-save'));

    expect(useProfileStore.getState().phone).toBe('+971 50 123 4567');
  });
});

describe('about + legal', () => {
  it('routes to each document', () => {
    renderScreen(<AboutScreen />);

    fireEvent.press(screen.getByTestId('about-terms'));
    expect(mockPush).toHaveBeenCalledWith('/terms');

    fireEvent.press(screen.getByTestId('about-privacy'));
    expect(mockPush).toHaveBeenCalledWith('/privacy');

    fireEvent.press(screen.getByTestId('about-support'));
    expect(mockPush).toHaveBeenCalledWith('/support');
  });

  it('states that the document is missing instead of rendering a blank page', () => {
    renderScreen(<TermsScreen />);

    // The Figma frame has a title and no body; an empty scroll view reads as a
    // rendering bug, so the screen says so explicitly.
    expect(screen.getByTestId('legal-empty')).toBeTruthy();
  });
});

describe('contact support', () => {
  it('keeps Send disabled until there is both a subject and a message', () => {
    renderScreen(<ContactSupportScreen />);

    const send = () => screen.getByTestId('support-send');
    expect(send().props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(screen.getByTestId('support-subject'), 'Billing');
    expect(send().props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(screen.getByTestId('support-message'), 'My invoice is wrong');
    expect(send().props.accessibilityState.disabled).toBe(false);
  });
});

it('paints the settings rows from the active palette', () => {
  renderScreen(<AboutScreen />, 'dark');
  expect(screen.getByText('Terms of Use').props.style.color).toBe(THEMES.dark.color.textPrimary);
  screen.unmount();

  renderScreen(<AboutScreen />, 'light');
  expect(screen.getByText('Terms of Use').props.style.color).toBe(THEMES.light.color.textPrimary);
});
