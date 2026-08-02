import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import MemoryScreen from '../screens/MemoryScreen';
import MemorySummaryScreen from '../screens/MemorySummaryScreen';
import { useMemoryStore } from '@/shared/memory';

import { initI18n } from '@/shared/i18n';
import { ThemeProvider, type ThemeMode } from '@/shared/theme';

/*
 * Memory (Figma 185:3164) and Memory summary (187:824).
 *
 * Covers the three promises the screens make that a layout snapshot would not:
 * the switch commits immediately while the fields wait for ✓, the composer only
 * arms on real input, and destroying the summary takes a confirmation.
 */

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock('../api/settingsApi', () => ({
  getMemory: jest.fn(),
  updateMemory: jest.fn(),
  appendMemorySummary: jest.fn(),
  clearMemorySummary: jest.fn(() => Promise.resolve()),
}));
const {
  getMemory: mockGetMemory,
  updateMemory: mockUpdateMemory,
  appendMemorySummary: mockAppendMemorySummary,
  clearMemorySummary: mockClearMemorySummary,
} = jest.requireMock('../api/settingsApi') as Record<string, jest.Mock>;
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
  mockGetMemory.mockReturnValue(new Promise(() => {}));
  mockUpdateMemory.mockImplementation(async (patch) => ({
    ...useMemoryStore.getState(),
    ...patch,
    summaryUpdatedAt: useMemoryStore.getState().summaryUpdatedAt
      ? new Date(useMemoryStore.getState().summaryUpdatedAt!).toISOString()
      : null,
  }));
  mockAppendMemorySummary.mockImplementation(async (text) => ({
    ...useMemoryStore.getState(),
    summary: text,
    summaryUpdatedAt: new Date().toISOString(),
  }));
  mockClearMemorySummary.mockClear();
  useMemoryStore.setState({
    enabled: false,
    nickname: '',
    occupation: '',
    about: '',
    summary: '',
    summaryUpdatedAt: null,
    hasHydrated: true,
  });
});

describe('MemoryScreen', () => {
  it('commits the switch immediately, without waiting for the confirm action', () => {
    renderScreen(<MemoryScreen />);

    fireEvent(screen.getByTestId('memory-enable'), 'press');

    expect(useMemoryStore.getState().enabled).toBe(true);
  });

  it('holds the text fields as a draft until the header check is tapped', async () => {
    renderScreen(<MemoryScreen />);

    fireEvent.changeText(screen.getByTestId('memory-nickname'), '  Mahfuz  ');
    fireEvent.changeText(screen.getByTestId('memory-occupation'), 'Engineer');

    // Still untouched — typing alone must not write to storage.
    expect(useMemoryStore.getState().nickname).toBe('');

    fireEvent.press(screen.getByTestId('screen-action-confirm'));

    expect(useMemoryStore.getState().nickname).toBe('Mahfuz');
    expect(useMemoryStore.getState().occupation).toBe('Engineer');
    await waitFor(() => expect(mockBack).toHaveBeenCalled());
  });

  it('pushes the summary screen from the summary row', () => {
    renderScreen(<MemoryScreen />);

    fireEvent.press(screen.getByTestId('memory-summary-link'));

    expect(mockPush).toHaveBeenCalledWith('/memory-summary');
  });
});

describe('MemorySummaryScreen', () => {
  it('shows the generic explanation while nothing has been learned', () => {
    renderScreen(<MemorySummaryScreen />);

    expect(screen.getByTestId('memory-overview-body')).toBeTruthy();
    expect(screen.queryByTestId('screen-header-subtitle')).toBeNull();
  });

  it('keeps send absent until the draft has content, then appends and stamps it', () => {
    renderScreen(<MemorySummaryScreen />);

    expect(screen.queryByTestId('memory-add-send')).toBeNull();

    fireEvent.changeText(screen.getByTestId('memory-add-input'), 'Prefers concise answers');
    fireEvent.press(screen.getByTestId('memory-add-send'));

    expect(useMemoryStore.getState().summary).toBe('Prefers concise answers');
    expect(useMemoryStore.getState().summaryUpdatedAt).not.toBeNull();
    // Draft cleared, so the button is gone again.
    expect(screen.queryByTestId('memory-add-send')).toBeNull();
  });

  it('ignores a whitespace-only note rather than bumping the updated time', () => {
    renderScreen(<MemorySummaryScreen />);

    fireEvent.changeText(screen.getByTestId('memory-add-input'), '   ');

    expect(screen.queryByTestId('memory-add-send')).toBeNull();
    expect(useMemoryStore.getState().summaryUpdatedAt).toBeNull();
  });

  it('requires confirmation before clearing the summary', () => {
    useMemoryStore.setState({ summary: 'Knows TypeScript', summaryUpdatedAt: 1000 });
    renderScreen(<MemorySummaryScreen />);

    fireEvent.press(screen.getByTestId('screen-action-clear'));

    // The tap opens the dialog; nothing is destroyed yet.
    expect(useMemoryStore.getState().summary).toBe('Knows TypeScript');

    fireEvent.press(screen.getByTestId('confirm-accept'));

    expect(useMemoryStore.getState().summary).toBe('');
    expect(useMemoryStore.getState().summaryUpdatedAt).toBeNull();
  });
});
