import { act, renderHook, waitFor } from '@testing-library/react-native';

import useAppBootstrap, { SPLASH_MIN_DURATION_MS } from '../useAppBootstrap';

const mockInitI18n = jest.fn<Promise<unknown>, []>();

jest.mock('@/shared/i18n', () => ({
  initI18n: () => mockInitI18n(),
}));

/*
 * Regression coverage for the splash-duration defect in the old App.tsx gate:
 * i18n resolving faster than the splash animation used to truncate the 2s brand
 * moment. SPLASH_MIN_DURATION_MS is a floor, not a fixed delay.
 */
describe('useAppBootstrap', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockInitI18n.mockReset().mockResolvedValue(undefined);
  });
  afterEach(() => jest.useRealTimers());

  it('holds the splash for its full duration even when bootstrap resolves instantly', async () => {
    const { result } = renderHook(() => useAppBootstrap());

    // Let the resolved mockInitI18n promise flush without advancing the clock.
    await act(async () => {});
    expect(result.current.booted).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(SPLASH_MIN_DURATION_MS - 1);
    });
    expect(result.current.booted).toBe(false);

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    await waitFor(() => expect(result.current.booted).toBe(true));
  });

  it('keeps waiting past the floor while bootstrap work is still pending', async () => {
    let resolveI18n: (() => void) | undefined;
    mockInitI18n.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveI18n = resolve;
      }),
    );

    const { result } = renderHook(() => useAppBootstrap());

    await act(async () => {
      jest.advanceTimersByTime(SPLASH_MIN_DURATION_MS * 2);
    });
    expect(result.current.booted).toBe(false);

    await act(async () => {
      resolveI18n?.();
    });
    await waitFor(() => expect(result.current.booted).toBe(true));
  });

  it('waits for injected feature tasks, not just i18n', async () => {
    let resolveTask: (() => void) | undefined;
    const task = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveTask = resolve;
        }),
    );

    const { result } = renderHook(() => useAppBootstrap([task]));

    await act(async () => {
      jest.advanceTimersByTime(SPLASH_MIN_DURATION_MS * 2);
    });
    expect(task).toHaveBeenCalledTimes(1);
    expect(result.current.booted).toBe(false);

    await act(async () => {
      resolveTask?.();
    });
    await waitFor(() => expect(result.current.booted).toBe(true));
  });

  it('boots even when an injected task throws synchronously', async () => {
    const exploding = () => {
      throw new Error('task exploded before returning a promise');
    };

    const { result } = renderHook(() => useAppBootstrap([exploding]));

    await act(async () => {
      jest.advanceTimersByTime(SPLASH_MIN_DURATION_MS);
    });
    await waitFor(() => expect(result.current.booted).toBe(true));
  });

  it('boots even when a bootstrap task rejects (allSettled, not all)', async () => {
    mockInitI18n.mockRejectedValue(new Error('i18n exploded'));

    const { result } = renderHook(() => useAppBootstrap());

    await act(async () => {
      jest.advanceTimersByTime(SPLASH_MIN_DURATION_MS);
    });
    await waitFor(() => expect(result.current.booted).toBe(true));
  });

  it('reports failed task names alongside booted', async () => {
    const exploding = () => Promise.reject(new Error('user task exploded'));

    const { result } = renderHook(() => useAppBootstrap([exploding]));

    await act(async () => {
      jest.advanceTimersByTime(SPLASH_MIN_DURATION_MS);
    });
    await waitFor(() => expect(result.current.booted).toBe(true));
    expect(result.current.failedTasks).toEqual(['task#0']);
  });

  it('reports an empty failedTasks list on the happy path', async () => {
    const { result } = renderHook(() => useAppBootstrap());

    await act(async () => {
      jest.advanceTimersByTime(SPLASH_MIN_DURATION_MS);
    });
    await waitFor(() => expect(result.current.booted).toBe(true));
    expect(result.current.failedTasks).toEqual([]);
  });
});
