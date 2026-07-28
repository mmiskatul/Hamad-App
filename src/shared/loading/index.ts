/*
 * shared/loading — the project-wide loading contract.
 *
 * Rule (CLAUDE.md "Skeleton loading"): no screen renders partially and no
 * screen shows a bare spinner. Anything waiting on assets or data goes through
 * <ScreenGate> with a skeleton that matches that screen's layout, composed from
 * the Shimmer primitive in shared/ui.
 */

export { default as ScreenGate } from './ScreenGate';
export { default as useAssetPreload } from './useAssetPreload';
export type { AssetPreloadState, AssetPreloadOptions } from './useAssetPreload';
