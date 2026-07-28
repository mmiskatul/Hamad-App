/*
 * Type declarations for expo-router's Jest matchers.
 *
 * `expo-router/testing-library` registers these matchers at runtime (see
 * expo-router/build/testing-library/expect.js) but ships no type augmentation
 * for them — its own expect.d.ts is an empty `export {}`. Without this file,
 * `expect(screen).toHavePathname('/onboarding')` runs correctly but fails
 * typecheck with TS2339.
 *
 * Verified against expo-router 6.0.24. If a future version starts shipping its
 * own declarations, delete this file rather than letting the two drift.
 */

declare global {
  namespace jest {
    interface Matchers<R> {
      /** Asserts the current route's pathname, e.g. '/onboarding'. */
      toHavePathname(pathname: string): R;
      /** Asserts the pathname with its params substituted in. */
      toHavePathnameWithParams(pathname: string): R;
      /** Asserts the full React Navigation state tree. */
      toHaveRouterState(state: unknown): R;
      /** Asserts the current route's search params. */
      toHaveSearchParams(params: Record<string, unknown>): R;
      /** Asserts the current route's segments, e.g. ['(auth)', 'onboarding']. */
      toHaveSegments(segments: string[]): R;
    }
  }
}

export {};
