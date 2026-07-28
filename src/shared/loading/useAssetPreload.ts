import { useEffect, useMemo, useRef, useState } from 'react';
import { Asset } from 'expo-asset';

/*
 * useAssetPreload — resolve a screen's static assets before the screen renders.
 *
 * This is the data half of the project-wide skeleton rule (see CLAUDE.md
 * "Skeleton loading"): a screen must not render half-painted while its images
 * are still downloading from the Metro dev server / OTA bundle. Pair it with
 * <ScreenGate> and a layout-matching skeleton.
 *
 * WHICH MODULES BELONG HERE:
 *   - `require()`d raster assets (.png/.jpg) — these are numeric module ids that
 *     expo-asset can resolve and cache.
 *   - NOT .svg imports. `react-native-svg-transformer` turns those into React
 *     components at bundle time, so they are already in memory when the screen
 *     mounts and there is nothing to preload.
 *
 * FAIL-OPEN CONTRACT (deliberate):
 *   If an asset errors, or the whole batch exceeds `failOpenAfterMs`, we still
 *   flip `ready` to true and expose `failed: true`. Trapping the user on an
 *   infinite skeleton because a decorative backdrop 404'd would be a worse
 *   product than rendering the screen without it — every screen using this hook
 *   must stay usable when its images are missing. Callers that genuinely cannot
 *   render without an asset can branch on `failed` and show an error state.
 */

export type AssetPreloadState = {
  /** True once assets resolved, failed, or the fail-open deadline elapsed. */
  ready: boolean;
  /** True when at least one asset failed or the deadline elapsed first. */
  failed: boolean;
  error?: Error;
};

export type AssetPreloadOptions = {
  /** Render anyway after this many ms, even if assets are still pending. Default 8000. */
  failOpenAfterMs?: number;
};

const DEFAULT_FAIL_OPEN_MS = 8000;

export function useAssetPreload(
  modules: readonly number[],
  options: AssetPreloadOptions = {},
): AssetPreloadState {
  const { failOpenAfterMs = DEFAULT_FAIL_OPEN_MS } = options;

  // Nothing to load → ready on the first render, no state churn, no flash.
  const isEmpty = modules.length === 0;
  const [state, setState] = useState<AssetPreloadState>({
    ready: isEmpty,
    failed: false,
  });

  // Callers pass an inline array literal at their call site; key on the ids so
  // the effect doesn't re-run on every render of the host screen.
  const key = useMemo(() => modules.join(','), [modules]);
  const modulesRef = useRef(modules);
  modulesRef.current = modules;

  useEffect(() => {
    if (isEmpty) return;

    let cancelled = false;
    const settle = (next: AssetPreloadState) => {
      if (!cancelled) setState(next);
    };

    const deadline = setTimeout(() => {
      settle({
        ready: true,
        failed: true,
        error: new Error(`Asset preload exceeded ${failOpenAfterMs}ms`),
      });
    }, failOpenAfterMs);

    Asset.loadAsync(modulesRef.current as number[])
      .then(() => settle({ ready: true, failed: false }))
      .catch((error: unknown) =>
        settle({
          ready: true,
          failed: true,
          error: error instanceof Error ? error : new Error(String(error)),
        }),
      )
      .finally(() => clearTimeout(deadline));

    return () => {
      cancelled = true;
      clearTimeout(deadline);
    };
  }, [key, isEmpty, failOpenAfterMs]);

  return state;
}

export default useAssetPreload;
