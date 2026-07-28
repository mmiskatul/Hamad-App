import React from 'react';
import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Svg, Defs, RadialGradient, Ellipse, Stop } from 'react-native-svg';
import CitySkyline from '../../../../assets/auth/city-skyline.png';
import TopLeftPattern from '../../../../assets/auth/top-left-pattern.svg';

import { useAuthPalette } from '../palette';

/*
 * Atmospheric layers of the onboarding screen, extracted so the real screen and
 * its skeleton render the exact same backdrop from ONE definition. They used to
 * duplicate the markup and had already drifted apart.
 *
 * Figma composition (node 113:2120): the skyline is a full-bleed backdrop, NOT
 * a bottom strip. Two heavily blurred ellipses (real Figma exports, see below)
 * eat its top and bottom edges; a radial scrim over the image keeps the tower
 * legible at centre while its edges melt into the canvas.
 *
 * THEME: the auth subtree follows the adaptive theme (see src/features/auth/index.ts).
 * The image edge feathers now use the resolved `palette.canvas` so the gradient
 * blends into whichever palette the user has selected — dark in dark mode, light
 * in light mode. The vignette colour stays #131314 regardless of mode: the
 * vignette darkens the pattern + skyline from above, and an absolute dark
 * scrim reads correctly on both light and dark canvases (in light mode it acts
 * as a tinted shadow over the pattern, the same way the Figma export intended).
 */

/*
 * The skyline band starts ~36% down the frame and runs to the bottom edge
 * (Figma: the tower's base sits just above the CTA stack).
 *
 * It is a PERCENTAGE on a plain container View, never on the <Image> itself:
 * an absolutely positioned RN <Image> given `top: '36%' + bottom: 0` with no
 * intrinsic box resolved to zero height on device and the skyline never
 * painted at all — the screen shipped as a flat black canvas. The container
 * owns the geometry; the Image just fills it with width/height 100%.
 *
 * `left`/`right` rather than `start`/`end`: this layer is a symmetric
 * full-bleed backdrop, so there is nothing for RTL to flip, and start/end are
 * unreliable on absolutely positioned children.
 */
const SKYLINE_TOP = '20%';

/*
 * The ornamental line-art motif. Two things about this asset are load-bearing:
 *
 * 1. It is a FULL-FRAME overlay, not a corner badge. Its single path spans
 *    x -52..453 / y -25..900 inside a 402x874 viewBox — i.e. the whole screen.
 *    It reads as a "top-left pattern" only because everything below ~36% is
 *    covered by the skyline and its gradient; the top-left is simply the part
 *    left sitting on bare canvas. Rendering it at a literal 280x280 (as this
 *    did) squashed the entire composition into a thumbnail in the corner.
 *    Hence width/height 100% + `slice` (cover), so it scales with the device
 *    instead of being pinned to Figma's 402-wide frame.
 *
 * 2. It CARRIES ITS OWN FILL — the path ends `fill="#3F332B"`. Do NOT pass a
 *    `fill` prop here. react-native-svg-transformer spreads props onto the root
 *    <Svg> after the file's own attributes, so a `fill` prop silently overrides
 *    the asset's real colour. That is exactly what went wrong before: this
 *    rendered with the bronze accent #A05F28 instead of the desaturated
 *    #3F332B, which is why the motif read as loud decoration. The root
 *    `fill="none"` is a Figma export convention and does not affect a path that
 *    declares its own fill. Same for `opacity` — the asset needs none.
 */

/*
 * The two vignettes (Figma "Ellipse 3" 385:805 and "Ellipse 1" 120:2158). Figma
 * draws them as solid ellipses under a blur(40); here they are react-native-svg
 * <Ellipse>s filled with a RADIAL gradient — dense at the centre, fading to
 * fully transparent at the rim — which reproduces the blurred-solid look with a
 * guaranteed-soft falloff.
 *
 * WHY radial gradients and not the exported ellipse SVGs: those exports carry an
 * feGaussianBlur <filter>, and react-native-svg's filter support is young and
 * renders hard-edged on some devices. A radial gradient needs no filter and is
 * uniformly supported. It also renders per the user's request to apply the
 * radial gradient on these vignettes rather than as a scrim over the skyline.
 *
 * Geometry is in the Figma FRAME's 402x874 coordinate space (cx/cy/rx/ry taken
 * from each node's centre and half-size), and the whole <Svg> is stretched over
 * the backdrop with that viewBox + `slice`, so the ellipses stay anchored to the
 * frame corners on any screen size:
 *   top    node -91.38,-213.25 sized 648.37x601.85 -> centre (233, 88) r 324x301
 *   bottom node -165,672       sized 722x344       -> centre (196, 844) r 361x172
 *
 * Vignette colour is now theme-driven so the scrim darkens against light
 * canvases and against dark canvases: in dark mode the canvas IS #131314-ish
 * so the vignette blends seamlessly; in light mode the dark vignette reads as
 * a tinted shadow over the pattern, the way the Figma export intended.
 */
const VIGNETTE_VIEWBOX = { width: 402, height: 874 } as const;
const VIGNETTE_TOP = { cx: 233, cy: 88, rx: 324, ry: 301 } as const;
// Bottom vignette shifted RIGHT (cx 196 -> 268) per design direction, and widened
// so its dark falloff reaches past the image's lower-right edge with no seam.
const VIGNETTE_BOTTOM = { cx: 268, cy: 848, rx: 400, ry: 190 } as const;

const IMAGE_TOP_FADE_HEIGHT = '48%' as const;
const IMAGE_BOTTOM_FADE_HEIGHT = '42%' as const;

/*
 * Falloff, shared by both ellipses. [offset, opacity] against the vignette
 * colour. The interior holds near-solid so the vignette actually darkens (the
 * top one has to swallow the pattern, per Figma), then feathers out over the
 * last third so there is no visible ring. Subjective — tune here, in one place.
 */
const VIGNETTE_STOPS: ReadonlyArray<readonly [string, number]> = [
  ['0%', 0.95],
  ['55%', 0.82],
  ['80%', 0.4],
  ['100%', 0],
];

export default function OnboardingBackdrop(): React.JSX.Element {
  const palette = useAuthPalette();
  // Vignette colour: ink in dark mode, ink in light mode too. Both palettes need
  // a DARKER scrim to eat the skyline edges; a light scrim would re-lighten
  // what the gradient is trying to darken. In dark mode the vignette matches
  // the canvas and disappears into it; in light mode it acts as a tinted shadow
  // over the pattern (the same role it served in the original brand export).
  const vignetteColor = '#131314';
  const imageTopFade = [palette.canvas, 'transparent'] as const;
  const imageBottomFade = ['transparent', palette.canvas] as const;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
      {/*
       * Paint order is child order in React Native. The pattern is FIRST because
       * it sits behind everything (user instruction) — the skyline, the fade and
       * the corner vignettes all layer on top of it.
       */}
      <TopLeftPattern
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      <View style={{ position: 'absolute', top: SKYLINE_TOP, bottom: 0, left: 0, right: 0 }}>
        <Image source={CitySkyline} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
        {/* Top edge feather — anchored to the band, so it always covers the image
            top seam regardless of device aspect ratio. Colour follows the
            resolved canvas so the image emerges out of whatever palette is on
            screen. */}
        <LinearGradient
          colors={[...imageTopFade]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: IMAGE_TOP_FADE_HEIGHT }}
        />
        {/* Bottom feather — image melts into the canvas behind the CTA stack. */}
        <LinearGradient
          colors={[...imageBottomFade]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: IMAGE_BOTTOM_FADE_HEIGHT }}
        />
      </View>
      {/*
       * Vignettes last: they darken the pattern AND the skyline, which is what
       * shapes how much of the motif shows through (in Figma the big top ellipse
       * is what leaves only the top-left corner visible). One full-frame <Svg>
       * carries both radial-gradient ellipses; `slice` makes the frame viewBox
       * cover the backdrop so the ellipses stay corner-anchored on any device.
       */}
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIGNETTE_VIEWBOX.width} ${VIGNETTE_VIEWBOX.height}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
      >
        <Defs>
          <RadialGradient id="vignette-top" cx="50%" cy="50%" r="50%">
            {VIGNETTE_STOPS.map(([offset, opacity]) => (
              <Stop key={offset} offset={offset} stopColor={vignetteColor} stopOpacity={opacity} />
            ))}
          </RadialGradient>
          <RadialGradient id="vignette-bottom" cx="50%" cy="50%" r="50%">
            {VIGNETTE_STOPS.map(([offset, opacity]) => (
              <Stop key={offset} offset={offset} stopColor={vignetteColor} stopOpacity={opacity} />
            ))}
          </RadialGradient>
        </Defs>
        <Ellipse {...VIGNETTE_TOP} fill="url(#vignette-top)" />
        <Ellipse {...VIGNETTE_BOTTOM} fill="url(#vignette-bottom)" />
      </Svg>
    </View>
  );
}
