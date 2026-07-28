import React from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useNextPlan } from '@/shared/plan';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import { HexLogo } from '@/shared/ui';

/*
 * Empty-state hero (Figma "Splash Text Container" 404:1794 + the logo at
 * 404:1799): brand mark, welcome headline, one-line pitch, Upgrade chip.
 *
 * Upgrade chip text dynamically adapts:
 *   Free plan -> "Upgrade to Pro"
 *   Pro plan -> "Upgrade to Business"
 *   Business plan -> Hidden (null)
 */
const HERO_WIDTH = 253;
/*
 * The Upgrade chip uses the THEME-FILL TWO-LAYER pattern (see IconPillButton):
 * a plain <View> carries the themed muted fill, and the inner
 * AnimatedPressable handles the press + ripple. Putting the themed fill on
 * the animated wrapper used to fail to repaint on a theme flip on Android
 * (the reanimated style path doesn't repaint from token swaps).
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type WelcomeHeroProps = {
  onUpgrade?: () => void;
  /**
   * Logomark-only mode: render the brand mark but skip the headline,
   * subtitle, and Upgrade chip. Used while the composer is active so the
   * brand stays anchored while the draft takes the rest of the screen.
   */
  compact?: boolean;
};

function WelcomeHero({ onUpgrade, compact = false }: WelcomeHeroProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const nextPlan = useNextPlan();

  return (
    <View style={{ alignItems: 'center', gap: theme.space.lg }}>
      <HexLogo motion="none" />

      {compact ? null : (
        <View style={{ width: HERO_WIDTH, alignItems: 'center', gap: theme.space.lg }}>
          <AppText style={{ ...theme.type.h4, color: theme.color.textPrimary, textAlign: 'center' }}>
            {t('chat.welcome.title')}
          </AppText>
          <AppText style={{ ...theme.type.caption, color: theme.color.textSecondary, textAlign: 'center' }}>
            {t('chat.welcome.subtitle')}
          </AppText>

          {nextPlan ? (
            <View
              style={{
                // Themed muted fill on the plain <View> so the theme flip
                // repaints (the reanimated style path skips the repaint on
                // token changes).
                backgroundColor: theme.color.muted,
                borderRadius: theme.radius.pill,
                overflow: 'hidden',
              }}
              testID="chat-upgrade-fill"
            >
              <AnimatedPressable
                onPress={onUpgrade}
                accessibilityRole="button"
                android_ripple={{ color: theme.color.accentSoft }}
                style={{
                  minHeight: 32,
                  paddingHorizontal: theme.space.md,
                  paddingVertical: theme.space.sm,
                }}
                testID="chat-upgrade"
              >
                <AppText style={{ ...theme.type.body, color: theme.color.textPrimary }}>
                  {nextPlan === 'business' ? t('chat.upgrade.business.cta') : t('chat.welcome.upgrade')}
                </AppText>
              </AnimatedPressable>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

/*
 * NOT memoised: every themed fill on this screen reads `theme.color.*`
 * inline, and `React.memo` can short-circuit the re-render that re-evaluates
 * those inline styles on Fabric — the user's reported bug was the hero's
 * muted Upgrade fill staying on the previous palette while the rest of the
 * canvas and text flipped. The body is two Texts and one Pressable; the
 * cost of re-running it on every parent render is negligible.
 */
export default WelcomeHero;
