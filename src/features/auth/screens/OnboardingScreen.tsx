import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HexLogo from '@/shared/ui/HexLogo';
import LanguageToggle from '../components/LanguageToggle';
import OnboardingBackdrop from '../components/OnboardingBackdrop';
import OnboardingFooter from '../components/OnboardingFooter';
import OnboardingScreenSkeleton from '../components/OnboardingScreenSkeleton';
import AuthButton from '../components/AuthButton';
import AuthDivider from '../components/AuthDivider';

import { useAuthPalette } from '../palette';
import { AUTH_TYPE } from '../constants';

import { useTranslation } from '@/shared/i18n/useTranslation';
import { ScreenGate, useAssetPreload } from '@/shared/loading';
import { AppText } from '@/shared/ui/AppText';

// Asset wiring: the filenames are accurate — `google-g.svg` is the multi-color
// Google G (viewBox 16, fills #F44336/#FFC107/#448AFF/#43A047), `apple.svg` is
// the white Apple mark (viewBox 24). A previous pass had these swapped, which
// put Apple on the Google button and vice-versa.
import GoogleG from '../../../../assets/auth/google-g.svg';
import AppleMark from '../../../../assets/auth/apple.svg';
import CitySkyline from '../../../../assets/auth/city-skyline.png';

/*
 * Figma node 113:2120 — Auth onboarding screen, 402×874 frame. The canvas
 * tracks the resolved theme so the screen reads correctly in both light and
 * dark mode (see src/features/auth/index.ts). Same glow anchoring as the
 * splash (top-left / bottom-right); the city skyline sits as a low-opacity
 * backdrop behind the CTA stack.
 *
 * Layout follows Figma's absolute pixel offsets:
 *   - Language toggle:        right: 16, top: 44
 *   - Logo + text container:  left: 52, top: 112, width: 298
 *   - CTA stack:              left: 16, right: 16, top: 597, width: 370
 *   - Footer label:           top: 813, centered horizontally, width: 279
 * Per the user's standing rule (2026-07-20): safe-area insets are added to the
 * absolute top offset so notched / dynamic-island devices never clip the
 * toggle. The vertical rhythm shifts by the inset amount vs. Figma — this
 * trade-off is documented in PROJECT_TRACKER (this chunk).
 *
 * LOADING CONTRACT: the default export is the GATED screen — it preloads this
 * screen's raster assets and renders OnboardingScreenSkeleton until they are
 * resolved (see src/shared/loading). OnboardingContent below assumes its
 * assets exist and is never mounted before they do.
 */

/*
 * Raster assets this screen waits on. Only the skyline qualifies: it is a
 * 2.67 MB PNG and by far the slowest thing on the screen. The SVGs are
 * compiled to React components by react-native-svg-transformer, so they are
 * already in the bundle and are not preloadable (nor do they need to be).
 *
 * Module-scope constant, not an inline literal, so the array identity is
 * stable across renders and useAssetPreload's effect runs exactly once.
 */
const ONBOARDING_ASSETS: readonly number[] = [CitySkyline];

export default function OnboardingScreen(): React.JSX.Element {
  const { ready } = useAssetPreload(ONBOARDING_ASSETS);

  return (
    <ScreenGate ready={ready} skeleton={<OnboardingScreenSkeleton />}>
      <OnboardingContent />
    </ScreenGate>
  );
}

/*
 * Figma measurements that survive the port to a flow layout.
 *
 * The Figma frame is a fixed 402×874 canvas and the original pass copied its
 * absolute offsets verbatim (`top: 597` for the CTA stack, `top: 813` for the
 * footer). On any shorter device that pushed the divider, the primary button
 * and the legal footer past the bottom edge. What is portable is the RHYTHM —
 * hero near the top, CTA stack pinned above the footer, exact gaps between
 * elements — so only gaps and intrinsic sizes stay as literals below.
 */
const SCREEN_PADDING = 16; // Figma CTA stack: left/right 16
const TOGGLE_TOP = 12; // below the safe-area inset, not the raw Figma 44
const HERO_TOP = 32; // gap between the top bar and the hex logo
const HERO_MAX_WIDTH = 298; // Figma hero text container width
const HERO_GAP = 12; // Figma gap: logo container → text container
const HERO_TEXT_GAP = 8; // Figma gap inside the text container
const CTA_GAP = 8; // Figma gap between CTA rows
const FOOTER_WIDTH = 279; // Figma footer label width
const FOOTER_GAP = 16;

function OnboardingContent(): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const palette = useAuthPalette();

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <OnboardingBackdrop />

      {/*
       * Content column. Everything below is in normal flow: the hero sits under
       * the top bar, a flexible spacer absorbs the leftover height, and the CTA
       * stack + footer are pinned above the bottom inset. That reproduces the
       * Figma composition on any screen height instead of only on 874px.
       */}
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + TOGGLE_TOP,
          paddingBottom: insets.bottom + SCREEN_PADDING,
          paddingHorizontal: SCREEN_PADDING,
        }}
      >
        {/* Top bar: language toggle, trailing edge (start/end so it flips under RTL) */}
        <View style={{ alignItems: 'flex-end' }}>
          <LanguageToggle />
        </View>

        {/* Hero block: hex logo + headline stack */}
        <View style={{ alignItems: 'center', marginTop: HERO_TOP }}>
          {/*
           * Same looping mark animation as the splash (Figma motion node
           * 338:800): the logo keeps spinning across the hand-off instead of
           * freezing the moment the splash redirects here.
           */}
          <HexLogo motion="none" />
          <View style={{ height: HERO_GAP }} />
          <View
            style={{
              alignItems: 'center',
              gap: HERO_TEXT_GAP,
              maxWidth: HERO_MAX_WIDTH,
            }}
          >
            {/*
             * Two-tone wordmark (Figma 113:2120): "OneAI" in the accent colour,
             * "Hub" in the text-primary colour. Rendered as ONE AppText with a
             * nested AppText so the two runs share a single line box and
             * baseline — two sibling <Text>s in a row would break the -0.49
             * letter-spacing rhythm and would not wrap as one word group under RTL.
             */}
            <AppText
              accessibilityLabel={t('auth.onboarding.title')}
              style={{ ...AUTH_TYPE.h1, color: palette.accent, textAlign: 'center' }}
            >
              {t('auth.onboarding.titleLead')}{' '}
              <AppText style={{ ...AUTH_TYPE.h1, color: palette.onSurface }}>
                {t('auth.onboarding.titleTrail')}
              </AppText>
            </AppText>
            <AppText style={{ ...AUTH_TYPE.h4, color: palette.onSurface, textAlign: 'center' }}>
              {t('auth.onboarding.subtitle')}
            </AppText>
            <AppText style={{ ...AUTH_TYPE.caption, color: palette.muted, textAlign: 'center' }}>
              {t('auth.onboarding.tagline')}
            </AppText>
          </View>
        </View>

        {/* Flexible gap — the skyline reads through here */}
        <View style={{ flex: 1, minHeight: 24 }} />

        {/* CTA stack */}
        <View style={{ alignItems: 'stretch', gap: CTA_GAP }}>
          <AuthButton
            icon={<GoogleG width={24} height={24} />}
            label={t('auth.onboarding.cta.google')}
            onPress={() => {
              // TODO: wire to real Google OAuth flow when backend is ready.
            }}
          />
          <AuthButton
            icon={<AppleMark width={24} height={24} />}
            label={t('auth.onboarding.cta.apple')}
            onPress={() => {
              // TODO: wire to real Apple OAuth flow when backend is ready.
            }}
          />

          {/* OR divider (shared component — same markup now lives on the login screen) */}
          <AuthDivider label={t('auth.onboarding.divider')} />

          {/* "Log in or sign up" — same pill, INVERTED fill */}
          <AuthButton
            variant="inverse"
            label={t('auth.onboarding.cta.email')}
            onPress={() => router.push('/login')}
          />
        </View>

        {/* Footer label (Figma w: 279, centered) */}
        <View style={{ alignItems: 'center', marginTop: FOOTER_GAP }}>
          <View style={{ width: FOOTER_WIDTH }}>
            <OnboardingFooter />
          </View>
        </View>
      </View>
    </View>
  );
}
