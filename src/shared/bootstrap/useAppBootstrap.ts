import { useEffect, useRef, useState } from 'react';

import { initI18n } from '@/shared/i18n';

/*
 * useAppBootstrap — the one-time work that must finish before the app leaves
 * the splash route.
 *
 * Consumed by src/app/index.tsx (the splash route), which redirects to
 * /onboarding once this reports booted.
 *
 * NOTE ON LOCATION: this lives in shared/, not in src/app/, because under
 * Expo Router every file inside src/app IS a route — a non-route module there
 * would be treated as a screen and warn about a missing default export.
 * src/app contains routes and layouts only.
 *
 * Two conditions must BOTH hold before we report booted:
 *
 *   1. Every bootstrap task has settled. i18n is built in (it is shared
 *      infrastructure); anything owned by a FEATURE is injected by the caller
 *      via `tasks` — src/app/index.tsx passes the auth flow's storage
 *      rehydration. That inversion is deliberate: shared/ must not import from
 *      features/, so the route (the composition root, which may import both)
 *      wires them together. Keychain session restore (FUTURE #8) joins the same
 *      way.
 *      Tasks are settled with allSettled, not all — a failed task must not
 *      strand the user on the splash screen forever. i18next falls back to
 *      raw keys, which is degraded but usable; a hung splash is not.
 *
 *   2. SPLASH_MIN_DURATION_MS has elapsed. The splash plays a 2s animation
 *      (HexLogo SPIN_MS + REST_MS) and the brand moment must not be cut short
 *      on a fast device. This is a FLOOR, not a fixed delay — slow boots take
 *      as long as they take.
 *
 * The original App.tsx gate got this wrong: its `.finally()` flipped straight
 * to onboarding whenever i18n resolved, so a 200ms i18n init truncated the 2s
 * splash to 200ms. The floor below is what fixes that.
 */

export const SPLASH_MIN_DURATION_MS = 2000;

/** A bootstrap task: started once on mount, awaited before the splash hands off. */
export type BootstrapTask = () => Promise<unknown>;

export function useAppBootstrap(tasks: readonly BootstrapTask[] = []): {
  booted: boolean;
  /**
   * Names of bootstrap tasks that failed (synchronous throw or rejected promise).
   * Empty array on the success path. Reported alongside `booted` so a caller
   * can surface a non-blocking warning without re-running the work; the array
   * is also logged via `console.warn` in development.
   */
  failedTasks: string[];
} {
  const [tasksDone, setTasksDone] = useState(false);
  const [floorElapsed, setFloorElapsed] = useState(false);
  const [failedTasks, setFailedTasks] = useState<string[]>([]);

  // Bootstrap runs exactly once. The task list is captured on mount so a caller
  // passing an inline array cannot re-trigger boot work on every render.
  const tasksRef = useRef(tasks);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      if (!cancelled) setFloorElapsed(true);
    }, SPLASH_MIN_DURATION_MS);

    // Each task is started inside a promise chain so a SYNCHRONOUS throw becomes
    // a rejection that allSettled can absorb. Called bare, `task()` would throw
    // straight out of this effect and the app would never leave the splash —
    // the exact failure mode allSettled is here to prevent.
    const started = tasksRef.current.map((task) => Promise.resolve().then(task));

    // i18n is the 0th task (no caller-provided name); the rest get a stable
    // "task#<index>" label since tasks are anonymous functions.
    const labels = ['i18n', ...tasksRef.current.map((_, index) => `task#${index}`)];

    Promise.allSettled([initI18n(), ...started]).then((results) => {
      if (cancelled) return;
      const failures = results
        .map((result, index) => (result.status === 'rejected' ? labels[index] : null))
        .filter((label): label is string => label !== null);
      if (failures.length > 0 && __DEV__) {
        console.warn('[useAppBootstrap] bootstrap tasks failed:', failures);
      }
      setFailedTasks(failures);
      setTasksDone(true);
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return { booted: tasksDone && floorElapsed, failedTasks };
}

export default useAppBootstrap;
