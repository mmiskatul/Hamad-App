import React from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';

import { formatCompact } from '@/shared/format';
import { usePlan } from '@/shared/plan';
import { useTheme } from '@/shared/theme';
import { PLAN_LIMITS, useUsageStore } from '@/shared/usage';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';

/*
 * The quota strip above the composer (Figma 149:1739 + 281:1099 + 428:1424).
 *
 * Two stacked parts:
 *   - a warning line, shown ONLY when the allowance is spent: "You have used all
 *     Request and tokens! want to buy more!". The WHOLE line is one tap target
 *     (a two-word hot zone inside a sentence is a miss waiting to happen) and it
 *     lands on the top-up tab of /upgrade, not the plan cards — the user is out
 *     of quota on the plan they already pay for.
 *   - the chip itself: bg/muted, top corners only (radius/sm), reading
 *     "1.2K/5K TOKENS • 20/100 REQ • FREE".
 *
 * THE WHOLE CHIP IS ONE TAP BUTTON. A small trailing chevron is rendered
 * inside the control to make it read as a button — the chip opens the plan
 * card (PlanMenu, the attachment menu's twin) on tap, and the chevron is the
 * visual cue that something happens.
 *
 * THE CARD IS RENDERED BY THE SCREEN, NOT HERE. Overlay covers its parent with
 * `StyleSheet.absoluteFill`, so a surface mounted inside this little strip gets
 * a scrim the size of the strip and an anchor measured from the strip's own box
 * — the card lands nowhere near where its numbers say. Overlays belong as the
 * LAST child of the screen's flex:1 root (mobile/CLAUDE.md), which is also what
 * keeps the app's one-overlay-at-a-time rule enforceable: the screen holds a
 * single `surface` value covering the drawer, the + menu and this card.
 */
const CHIP_PADDING_X = 10;
const CHIP_PADDING_Y = 4;
const DOT = 4;

/*
 * ANDROID REPAINT: the chip's muted fill is painted by an `AnimatedPressable`,
 * not a plain `Pressable`. On Android, a plain `Pressable` whose style carries
 * a themed `backgroundColor` does not reliably repaint when only the theme
 * token changes — the same bug the chat pills (Upgrade, model, menu) hit.
 * `Animated.createAnimatedComponent(Pressable)` gives reanimated a handle on
 * the style array and that re-evaluates the `backgroundColor` from the token
 * when `useTheme()` flips. We don't need an animated transform here — we just
 * need the wrapper, so `animatedStyle` is omitted and only the static style
 * object is passed in. See ChatHeader.tsx / WelcomeHero.tsx for the same
 * pattern.
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type UsageChipProps = {
  /**
   * Opens the plan card. The SCREEN owns that surface — see the header — so this
   * is a plain "the button was pressed" signal, not a menu the chip renders.
   */
  onPress?: () => void;
  /** Top-up — defaults to pushing /upgrade on its "Req. Extra" tab. */
  onBuyExtra?: () => void;
  /** True while the screen has the plan card open, for the button's a11y state. */
  expanded?: boolean;
  testID?: string;
};

function UsageChip({ onPress, onBuyExtra, expanded = false, testID }: UsageChipProps): React.JSX.Element {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const plan = usePlan();
  const requests = useUsageStore(state => state.requests);
  const tokens = useUsageStore(state => state.tokens);
  const limits = PLAN_LIMITS[plan];

  const spent = requests >= limits.requests || tokens >= limits.tokens;
  const short = (used: number, limit: number) =>
    `${formatCompact(used, i18n.language)}/${formatCompact(limit, i18n.language)}`;

  const goToExtra = onBuyExtra ?? (() => router.push('/upgrade?period=extra'));

  return (
    <View style={{ width: '100%', gap: 6 }} testID={testID}>
      {spent ? (
        <Pressable
          onPress={goToExtra}
          accessibilityRole="button"
          accessibilityLabel={`${t('chat.conversation.quotaSpent')} ${t('chat.conversation.buyMore')}`}
          hitSlop={6}
          testID="usage-chip-warning"
        >
          <AppText style={{ ...theme.type.tag, fontSize: 10, textAlign: 'center' }}>
            <AppText style={{ color: theme.color.textSecondary }}>
              {t('chat.conversation.quotaSpent')}{' '}
            </AppText>
            <AppText style={{ color: theme.color.accent }}>{t('chat.conversation.buyMore')}</AppText>
          </AppText>
        </Pressable>
      ) : null}

      <View style={{ paddingHorizontal: theme.space.lg }}>
        {/*
          Themed-fill wrapper around the AnimatedPressable. Putting the muted
          fill on the animated wrapper used to fail to repaint on a theme flip
          on Android (the reanimated style path doesn't repaint from token
          swaps). Painting the fill on a plain <View> and keeping the press
          handler on the inner AnimatedPressable restores the repaint — see
          IconPillButton's "themed-fill architecture" header for the same fix.
        */}
        <View
          style={{
            backgroundColor: theme.color.muted,
            // Docked to the composer: only the top corners are rounded.
            borderTopStartRadius: theme.radius.sm,
            borderTopEndRadius: theme.radius.sm,
            overflow: 'hidden',
          }}
          testID="usage-chip-fill"
        >
          <AnimatedPressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={t('chat.conversation.usageLabel')}
            accessibilityState={{ expanded }}
            android_ripple={{ color: theme.color.accentSoft }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingHorizontal: CHIP_PADDING_X,
              paddingVertical: CHIP_PADDING_Y,
            }}
            testID="usage-chip"
          >
            <Meta>{t('chat.conversation.tokensChip', { value: short(tokens, limits.tokens) })}</Meta>
            <Dot />
            <Meta>{t('chat.conversation.reqChip', { value: short(requests, limits.requests) })}</Meta>
            <Dot />
            <Meta>{t(`chat.plan.${plan}Name`)}</Meta>
            {/*
              Trailing chevron — small, low-emphasis. The chip reads as a button
              (the whole row opens the plan card), and the chevron is the visual
              cue that something happens on tap. Same icon as the model pill, but
              smaller so it doesn't compete with the quota numbers.
            */}
            <Icon icon={ArrowDown01Icon} size={10} color={theme.color.textPrimary} />
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
}

/*
 * NOT memoised: the chip is themed via inline `theme.color.*` reads, and
 * `React.memo` can short-circuit the re-render that re-evaluates those styles
 * on Fabric — the user's reported bug had themed fills on memo'd chat
 * components stuck on the previous palette. The chip is mounted twice in the
 * conversation view but the body is cheap.
 */
export default UsageChip;

function Meta({ children }: { children: string }): React.JSX.Element {
  const theme = useTheme();

  return (
    <AppText
      style={{
        ...theme.type.tag,
        // textPrimary, not textSecondary — the chip sits on bg/muted, and on
        // that fill secondary is so quiet the numbers disappear. The model pill
        // does the same: text on muted is primary.
        color: theme.color.textPrimary,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </AppText>
  );
}

function Dot(): React.JSX.Element {
  const theme = useTheme();

  return (
    <View
      style={{
        width: DOT,
        height: DOT,
        borderRadius: DOT / 2,
        backgroundColor: theme.color.textPrimary,
      }}
    />
  );
}
