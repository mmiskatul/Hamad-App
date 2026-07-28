import React from 'react';
import { View } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';

import ScreenGate from '../ScreenGate';

// Marker views only — this suite asserts on gate timing, not on rendered copy.
const Skeleton = () => <View testID="skeleton" />;
const Content = () => <View testID="content" />;

describe('ScreenGate', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders content immediately when ready on first render (no skeleton flash)', () => {
    render(
      <ScreenGate ready skeleton={<Skeleton />}>
        <Content />
      </ScreenGate>,
    );

    expect(screen.queryByTestId('skeleton')).toBeNull();
    expect(screen.getByTestId('content')).toBeTruthy();
  });

  it('shows the skeleton while not ready and swaps once ready + minVisibleMs elapses', () => {
    const view = render(
      <ScreenGate ready={false} skeleton={<Skeleton />} minVisibleMs={300}>
        <Content />
      </ScreenGate>,
    );

    expect(screen.getByTestId('skeleton')).toBeTruthy();
    expect(screen.queryByTestId('content')).toBeNull();

    // Ready arrives before the minimum visible window has elapsed: the skeleton
    // must hold, otherwise the swap reads as a strobe.
    act(() => {
      jest.advanceTimersByTime(100);
    });
    view.rerender(
      <ScreenGate ready skeleton={<Skeleton />} minVisibleMs={300}>
        <Content />
      </ScreenGate>,
    );
    expect(screen.getByTestId('skeleton')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.queryByTestId('skeleton')).toBeNull();
    expect(screen.getByTestId('content')).toBeTruthy();
  });

  it('suppresses the skeleton entirely for loads that resolve inside delayMs', () => {
    const view = render(
      <ScreenGate ready={false} skeleton={<Skeleton />} delayMs={150}>
        <Content />
      </ScreenGate>,
    );

    // Pre-delay window: nothing painted, and crucially no skeleton.
    expect(screen.queryByTestId('skeleton')).toBeNull();
    expect(screen.queryByTestId('content')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(50);
    });
    view.rerender(
      <ScreenGate ready skeleton={<Skeleton />} delayMs={150}>
        <Content />
      </ScreenGate>,
    );

    expect(screen.getByTestId('content')).toBeTruthy();
    expect(screen.queryByTestId('skeleton')).toBeNull();
  });
});
