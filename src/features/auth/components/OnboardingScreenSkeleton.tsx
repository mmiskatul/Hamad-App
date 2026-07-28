import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import OnboardingBackdrop from './OnboardingBackdrop';
import { useAuthPalette } from '../palette';
import Shimmer from '@/shared/ui/Shimmer';

/*
 * Skeleton variant of OnboardingScreen, used during the brief window between the
 * splash animation finishing and the screen's raster assets resolving.
 *
 * Mirrors the real screen's layout 1:1 — same backdrop component, same flow
 * layout (top bar → hero → flexible gap → CTA stack → footer), same gaps and
 * intrinsic sizes — so the swap reads as a content swap, not a layout jump.
 * The shared constants below are the same values the screen uses; if the screen's
 * rhythm changes, change it here too.
 *
 * THEME: the auth subtree follows the adaptive theme (see src/features/auth/index.ts).
 * The skeleton canvas tracks the resolved palette (so the swap from skeleton to
 * screen is colour-consistent) and the shimmer blocks use derived surface
 * tones — `palette.surface` for the block fill, a slightly lighter step for the
 * highlight. Those tones are correct in both light and dark mode without
 * branching.
 */

const SCREEN_PADDING = 16;
const TOGGLE_TOP = 12;
const HERO_TOP = 32;
const HERO_GAP = 12;
const HERO_TEXT_GAP = 8;
const CTA_GAP = 8;
const DIVIDER_GAP = 16;
const BUTTON_HEIGHT = 52;
const FOOTER_GAP = 16;

// Hex logo footprint (Figma logo container)
const RING_WIDTH = 111;
const RING_HEIGHT = 131.26;

/*
 * The two shimmer tones step up from the canvas. `palette.surface` is the
 * resolved token so the skeleton reads against either palette; the highlight
 * is a hand-rolled `lighten()` step — `palette.surface` + ~7% lighter, which
 * matches the brand's own dark-palette shimmer pair (#242425 -> #3a3a3b) and
 * stays subtle on the light palette (#F7F7F7 -> ~#FFFFFF-ish).
 *
 * Kept as a tiny helper rather than a token because no other skeleton uses it.
 */
function shimmerTones(surface: string): { bg: string; hl: string } {
  // Naive RGB lighten: 12% towards #fff. Adequate for a skeleton shimmer.
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(surface);
  if (!m) return { bg: surface, hl: surface };
  const r = Math.round(parseInt(m[1], 16) + (255 - parseInt(m[1], 16)) * 0.18);
  const g = Math.round(parseInt(m[2], 16) + (255 - parseInt(m[2], 16)) * 0.18);
  const b = Math.round(parseInt(m[3], 16) + (255 - parseInt(m[3], 16)) * 0.18);
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return { bg: surface, hl: `#${hex(r)}${hex(g)}${hex(b)}` };
}

/** Every skeleton block is the same shimmer; only the box changes. */
function Block({
  width,
  height,
  radius = 8,
  surface,
  highlight,
}: {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  surface: string;
  highlight: string;
}): React.JSX.Element {
  return (
    <Shimmer
      width={width}
      height={height}
      borderRadius={radius}
      backgroundColor={surface}
      highlightColor={highlight}
    />
  );
}

export default function OnboardingScreenSkeleton(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const palette = useAuthPalette();
  const { bg: shimmerBg, hl: shimmerHl } = shimmerTones(palette.surface);

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <OnboardingBackdrop />

      <View
        style={{
          flex: 1,
          paddingTop: insets.top + TOGGLE_TOP,
          paddingBottom: insets.bottom + SCREEN_PADDING,
          paddingHorizontal: SCREEN_PADDING,
        }}
      >
        {/* Language toggle pill (90×32 in Figma) */}
        <View style={{ alignItems: 'flex-end' }}>
          <Block width={90} height={32} surface={shimmerBg} highlight={shimmerHl} />
        </View>

        {/* Hero: hex-logo placeholder + headline stack */}
        <View style={{ alignItems: 'center', marginTop: HERO_TOP }}>
          <Block
            width={RING_WIDTH}
            height={RING_HEIGHT}
            radius={12}
            surface={shimmerBg}
            highlight={shimmerHl}
          />
          <View style={{ height: HERO_GAP }} />
          <View style={{ alignItems: 'center', gap: HERO_TEXT_GAP }}>
            {/* Title (h1: 59 line-height) */}
            <Block width={240} height={48} surface={shimmerBg} highlight={shimmerHl} />
            {/* Subtitle (h4: 30 line-height) */}
            <Block width={260} height={26} radius={6} surface={shimmerBg} highlight={shimmerHl} />
            {/* Tagline — two caption lines */}
            <Block width={290} height={14} radius={4} surface={shimmerBg} highlight={shimmerHl} />
            <Block width={230} height={14} radius={4} surface={shimmerBg} highlight={shimmerHl} />
          </View>
        </View>

        <View style={{ flex: 1, minHeight: 24 }} />

        {/* CTA stack */}
        <View style={{ alignItems: 'stretch', gap: CTA_GAP }}>
          <Block
            width="100%"
            height={BUTTON_HEIGHT}
            radius={9999}
            surface={shimmerBg}
            highlight={shimmerHl}
          />
          <Block
            width="100%"
            height={BUTTON_HEIGHT}
            radius={9999}
            surface={shimmerBg}
            highlight={shimmerHl}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: DIVIDER_GAP }}>
            <View style={{ flex: 1, height: 1, backgroundColor: palette.edgeStrong }} />
            <Block width={16} height={15} radius={4} surface={shimmerBg} highlight={shimmerHl} />
            <View style={{ flex: 1, height: 1, backgroundColor: palette.edgeStrong }} />
          </View>

          <Block
            width="100%"
            height={BUTTON_HEIGHT}
            radius={9999}
            surface={shimmerBg}
            highlight={shimmerHl}
          />
        </View>

        {/* Legal footer — two caption lines */}
        <View style={{ alignItems: 'center', gap: 6, marginTop: FOOTER_GAP }}>
          <Block width={260} height={14} radius={4} surface={shimmerBg} highlight={shimmerHl} />
          <Block width={180} height={14} radius={4} surface={shimmerBg} highlight={shimmerHl} />
        </View>
      </View>
    </View>
  );
}
