import React, { useCallback } from 'react';
import { I18nManager, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter, type Href } from 'expo-router';
import { ArrowLeft01Icon, ArrowRight01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';

import { useAuthPalette, useAuthRipple } from '../palette';

import { useTranslation } from '@/shared/i18n/useTranslation';
import { Icon } from '@/shared/ui/Icon';
import { usePressFeedback } from '@/shared/ui/usePressFeedback';

/*
 * Back affordance for the auth stack.
 *
 * NAVIGATION CONTRACT — this is the whole point of the component:
 *   It POPS, it never PUSHES. `router.back()` removes the current route from the
 *   stack; `router.push('/login')` would mount a SECOND copy of login on top of
 *   the one already underneath, so tapping back/forward a few times would grow an
 *   unbounded stack of live screens (each keeping its own state, backdrop SVGs and
 *   keyboard-avoiding view mounted) — the memory/jank problem this component
 *   exists to avoid. Do not "fix" a navigation bug here by swapping in push().
 *
 *   `canGoBack()` is false only when this screen IS the first route — a deep link
 *   or a dev reload straight into /password. There is nothing to pop then, so we
 *   `replace` with the flow's entry point (default "/login"): replace swaps the
 *   current route instead of stacking on top of it, so the invariant holds on that
 *   path too.
 *
 * Android's hardware back already pops correctly and needs no wiring — this only
 * adds the visible affordance for iOS and for reachability on tall devices.
 *
 * RTL: the arrow is a direction, not a glyph — it flips with the writing direction
 * (mobile/CLAUDE.md: layouts must work RTL).
 *
 * THEME: the auth subtree follows the adaptive theme (see src/features/auth/index.ts);
 * the icon's color is `palette.onSurface` so it reads against either canvas.
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const HIT_SIZE = 40; // touch target ≥ 40pt (icon itself is 24)
const ICON_SIZE = 24;

/*
 * `close` is the same NAVIGATION with a different promise. A ✕ says "abandon
 * this, nothing is saved" — the right glyph for a screen the user opted into and
 * can decline (change password), where a back arrow would suggest a step in a
 * sequence. It is a variant rather than a second component because the contract
 * above (pop, never push; replace on a dead stack) is exactly what it needs too,
 * and duplicating that is how one of the two copies eventually gets it wrong.
 *
 * The ✕ does NOT mirror under RTL: it is a symbol, not a direction.
 */
type Variant = 'back' | 'close';

type Props = {
  variant?: Variant;
  /** Where to land when there is no history to pop (deep link / reload). */
  fallbackHref?: Href;
  testID?: string;
};

export default function AuthBackButton({
  variant = 'back',
  fallbackHref = '/login',
  testID,
}: Props): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const { animatedStyle, onPressIn, onPressOut } = usePressFeedback();
  const palette = useAuthPalette();
  const ripple = useAuthRipple();

  const onPress = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallbackHref);
  }, [router, fallbackHref]);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={t(variant === 'close' ? 'auth.close' : 'auth.back')}
      android_ripple={{ color: ripple.onDark, borderless: true, radius: HIT_SIZE / 2 }}
      style={[
        {
          width: HIT_SIZE,
          height: HIT_SIZE,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: HIT_SIZE / 2,
        },
        animatedStyle,
      ]}
    >
      <Icon
        icon={variant === 'close' ? Cancel01Icon : I18nManager.isRTL ? ArrowRight01Icon : ArrowLeft01Icon}
        size={ICON_SIZE}
        color={palette.onSurface}
      />
    </AnimatedPressable>
  );
}
