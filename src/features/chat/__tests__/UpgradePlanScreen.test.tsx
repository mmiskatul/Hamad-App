import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import UpgradePlanScreen from '../screens/UpgradePlanScreen';

import { initI18n } from '@/shared/i18n';
import { usePlanStore } from '@/shared/plan';
import { updateAccountPlan } from '@/shared/plan/planApi';
import { ThemeProvider, type ThemeMode } from '@/shared/theme';

jest.mock('@/shared/plan/planApi', () => ({
  updateAccountPlan: jest.fn(),
}));

const mockUpdateAccountPlan = jest.mocked(updateAccountPlan);

/*
 * Upgrade screen (Figma 404:1024) and its third segment, "Req. Extra"
 * (281:898).
 *
 * The segment is not a billing FREQUENCY — it sells extra quota on the plan you
 * already have — so it must REPLACE the plan cards rather than reprice them.
 * That swap, and the order validation behind "Confirm & Buy", are what these
 * cases pin down.
 */

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/* Route params, so `?period=extra` (the out-of-quota upsell) can be exercised. */
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => mockParams,
}));

function renderScreen(mode: ThemeMode | null = 'dark') {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider mode={mode ?? undefined}>
        <UpgradePlanScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

beforeAll(async () => {
  await initI18n();
});

beforeEach(() => {
  mockParams = {};
  mockUpdateAccountPlan.mockReset();
  usePlanStore.setState({ plan: 'free', hasHydrated: true });
});

describe('UpgradePlanScreen', () => {
  it('shows the three plan cards on the monthly segment', () => {
    renderScreen();

    expect(screen.getByTestId('plan-card-free')).toBeTruthy();
    expect(screen.getByTestId('plan-card-pro')).toBeTruthy();
    expect(screen.getByTestId('plan-card-business')).toBeTruthy();
    expect(screen.queryByTestId('request-extra-card')).toBeNull();
  });

  it('opens straight on the top-up card when routed with ?period=extra', () => {
    mockParams = { period: 'extra' };
    renderScreen();

    expect(screen.getByTestId('request-extra-card')).toBeTruthy();
    expect(screen.queryByTestId('plan-card-pro')).toBeNull();
  });

  it('ignores a junk period param rather than rendering nothing', () => {
    mockParams = { period: 'weekly' };
    renderScreen();

    expect(screen.getByTestId('plan-card-pro')).toBeTruthy();
  });

  it('replaces the plan cards with the top-up card on Req. Extra', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('billing-extra'));

    expect(screen.getByTestId('request-extra-card')).toBeTruthy();
    expect(screen.queryByTestId('plan-card-pro')).toBeNull();
  });

  it('keeps Confirm & Buy inert until a positive quantity is entered', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('billing-extra'));

    expect(screen.getByTestId('extra-cta').props.accessibilityState.disabled).toBe(true);

    // Zero is not an order.
    fireEvent.changeText(screen.getByTestId('extra-requests'), '0');
    expect(screen.getByTestId('extra-cta').props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(screen.getByTestId('extra-requests'), '25');
    expect(screen.getByTestId('extra-cta').props.accessibilityState.disabled).toBe(false);
  });

  it('accepts a token-only order', () => {
    renderScreen();
    fireEvent.press(screen.getByTestId('billing-extra'));

    fireEvent.changeText(screen.getByTestId('extra-tokens'), '250');

    expect(screen.getByTestId('extra-cta').props.accessibilityState.disabled).toBe(false);
  });

  it('returns to the plan cards when another segment is chosen', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('billing-extra'));
    fireEvent.press(screen.getByTestId('billing-annual'));

    expect(screen.getByTestId('plan-card-pro')).toBeTruthy();
    expect(screen.queryByTestId('request-extra-card')).toBeNull();
  });

  it('asks for confirmation before changing to Pro', async () => {
    mockUpdateAccountPlan.mockResolvedValue({
      plan: 'pro',
      limits: { requests: 500, tokens: 500_000 },
    });
    renderScreen();

    fireEvent.press(screen.getByTestId('plan-cta-pro'));

    expect(screen.getByTestId('plan-confirmation')).toBeTruthy();
    expect(screen.getByTestId('plan-confirmation-dialog')).toBeTruthy();
    expect(screen.getByTestId('dialog-surface')).toBeTruthy();
    expect(mockUpdateAccountPlan).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('plan-confirm'));

    await waitFor(() => expect(mockUpdateAccountPlan).toHaveBeenCalledWith('pro'));
    await waitFor(() => {
      expect(screen.getByTestId('plan-cta-pro').props.accessibilityState.selected).toBe(false);
    });
  });

  it('supports confirming the Business plan', async () => {
    mockUpdateAccountPlan.mockResolvedValue({
      plan: 'business',
      limits: { requests: 2_000, tokens: 1_500_000 },
    });
    renderScreen();

    fireEvent.press(screen.getByTestId('plan-cta-business'));
    fireEvent.press(screen.getByTestId('plan-confirm'));

    await waitFor(() => expect(mockUpdateAccountPlan).toHaveBeenCalledWith('business'));
  });

  it('cancels a selected plan without updating the backend', () => {
    renderScreen();

    fireEvent.press(screen.getByTestId('plan-cta-pro'));
    fireEvent.press(screen.getByTestId('plan-cancel'));

    expect(screen.queryByTestId('plan-confirmation')).toBeNull();
    expect(mockUpdateAccountPlan).not.toHaveBeenCalled();
  });

  it('keeps the confirmation visible and shows backend errors', async () => {
    mockUpdateAccountPlan.mockRejectedValue(new Error('Plan update failed'));
    renderScreen();

    fireEvent.press(screen.getByTestId('plan-cta-pro'));
    fireEvent.press(screen.getByTestId('plan-confirm'));

    await waitFor(() => {
      expect(screen.getByText('Plan update failed')).toBeTruthy();
    });
    expect(screen.getByTestId('plan-confirmation')).toBeTruthy();
  });
});
