import React, { useEffect, useRef, useState } from 'react';

/*
 * ScreenGate — the project-wide "skeleton before content" primitive.
 *
 * PROJECT RULE (see CLAUDE.md "Skeleton loading"): every screen that waits on
 * anything — bundled assets, i18n, a TanStack Query fetch, keychain session
 * restore — renders a layout-matching skeleton through this gate instead of a
 * spinner, a blank canvas, or a half-painted screen.
 *
 *   export default function SomeScreen() {
 *     const { ready } = useAssetPreload(SOME_SCREEN_ASSETS);
 *     const query = useSomeQuery();
 *     return (
 *       <ScreenGate ready={ready && !query.isPending} skeleton={<SomeScreenSkeleton />}>
 *         <SomeScreenContent data={query.data} />
 *       </ScreenGate>
 *     );
 *   }
 *
 * Two timing knobs exist to stop the skeleton itself becoming the glitch:
 *
 *   delayMs       Wait this long before showing the skeleton at all. A load that
 *                 resolves in 40ms should never flash a skeleton — that reads as
 *                 a rendering bug. Default 0 (show immediately), because the
 *                 common case here is a hand-off from the splash screen where a
 *                 blank frame would be worse than an instant skeleton.
 *
 *   minVisibleMs  Once shown, keep the skeleton up at least this long. Prevents
 *                 the strobe of skeleton→content→skeleton when several async
 *                 sources settle a few ms apart. Default 300.
 *
 * The children are not mounted until `ready`, so a screen may safely assume its
 * assets and data exist in its own render body.
 */

type Props = {
  /** Flip to true when everything the screen needs has settled. */
  ready: boolean;
  /** Layout-matching skeleton for THIS screen. Not a generic spinner. */
  skeleton: React.ReactNode;
  /** Delay before the skeleton appears, in ms. Default 0. */
  delayMs?: number;
  /** Minimum time the skeleton stays up once shown, in ms. Default 300. */
  minVisibleMs?: number;
  children: React.ReactNode;
};

export default function ScreenGate({
  ready,
  skeleton,
  delayMs = 0,
  minVisibleMs = 300,
  children,
}: Props): React.JSX.Element | null {
  const [skeletonVisible, setSkeletonVisible] = useState(delayMs === 0 && !ready);
  const [minElapsed, setMinElapsed] = useState(delayMs !== 0);
  const shownAtRef = useRef<number | null>(skeletonVisible ? Date.now() : null);

  // Phase 1 — decide whether the skeleton is worth showing at all.
  useEffect(() => {
    if (ready || delayMs === 0) return;
    const timer = setTimeout(() => {
      shownAtRef.current = Date.now();
      setSkeletonVisible(true);
      setMinElapsed(false);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [ready, delayMs]);

  // Phase 2 — once shown, hold it for minVisibleMs so the swap isn't a strobe.
  useEffect(() => {
    if (!skeletonVisible || minVisibleMs <= 0) {
      setMinElapsed(true);
      return;
    }
    const shownAt = shownAtRef.current ?? Date.now();
    const remaining = Math.max(0, minVisibleMs - (Date.now() - shownAt));
    if (remaining === 0) {
      setMinElapsed(true);
      return;
    }
    const timer = setTimeout(() => setMinElapsed(true), remaining);
    return () => clearTimeout(timer);
  }, [skeletonVisible, minVisibleMs]);

  if (ready && (!skeletonVisible || minElapsed)) return <>{children}</>;
  if (skeletonVisible) return <>{skeleton}</>;

  // Pre-delay window: nothing painted yet. Only reachable when delayMs > 0.
  return null;
}
