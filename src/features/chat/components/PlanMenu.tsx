import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Building06Icon,
  CheckmarkCircle02Icon,
  Coins01Icon,
  CrownIcon,
  Rocket01Icon,
} from '@hugeicons/core-free-icons';

import { PLANS, usePlan, type Plan } from '@/shared/plan';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import { Icon, type IconProps } from '@/shared/ui/Icon';
import Popover, { type PopoverAnchor, type PopoverOrigin } from '@/shared/ui/Popover';

/*
 * Plan menu — the card behind the quota chip's chevron.
 *
 * The chevron used to push /upgrade, which is wrong: a chevron promises a menu
 * that opens in place, not a screen change. This is that menu — the three tiers
 * with the current one ticked, plus the top-up row.
 *
 * IT IS THE ATTACHMENT MENU'S TWIN, DELIBERATELY — same card, same placement
 * rule, same motion. Same 220 width, same 20 radius, same row rhythm (36pt
 * bg/muted chip, 20pt glyph, body label). Both hang off a small control at the
 * bottom of the same screen a few points apart — the + button and this chevron —
 * so any difference in width, corner, row height or where it appears reads as a
 * bug rather than as a distinction.
 *
 * PLACEMENT IS ANCHORED, NOT MEASURED, for the same reason AttachmentMenu's is:
 * the control it belongs to sits a FIXED distance off the bottom inset, so the
 * card's position follows from the inset alone. Measuring the chevron at press
 * time was the previous cut — it cost an async native round-trip, a first frame
 * at a guessed position, and a visible correction jump the + menu never has.
 */
export const PLAN_MENU_WIDTH = 220;
export const PLAN_MENU_RADIUS = 20;

/*
 * Distance off the bottom inset, the same knob AttachmentMenu's ANCHOR_BOTTOM
 * (52) is: clears the composer (12 + 24 + 12 + 32 + 4) and the quota chip
 * (4 + 14 + 4) that the chevron lives in, leaving the card sitting just above it.
 */
const ANCHOR_BOTTOM = 124;
const ITEM_CHIP = 36;
const GLYPH_SIZE = 20;

const PLAN_GLYPH: Record<Plan, IconProps['icon']> = {
  free: Rocket01Icon,
  pro: CrownIcon,
  business: Building06Icon,
};

export type PlanMenuAction = 'plans' | 'extra';

export type PlanMenuProps = {
  visible: boolean;
  onDismiss: () => void;
  onAction: (action: PlanMenuAction) => void;
  /** Overrides for a caller that hangs the card off something else. */
  anchor?: PopoverAnchor;
  origin?: PopoverOrigin;
};

export default function PlanMenu({
  visible,
  onDismiss,
  onAction,
  anchor: customAnchor,
  origin: customOrigin,
}: PlanMenuProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const plan = usePlan();

  const defaultAnchor: PopoverAnchor = { start: 16, bottom: insets.bottom + ANCHOR_BOTTOM };
  const defaultOrigin: PopoverOrigin = 'bottom-start';

  return (
    <Popover
      visible={visible}
      onDismiss={onDismiss}
      anchor={customAnchor ?? defaultAnchor}
      origin={customOrigin ?? defaultOrigin}
      width={PLAN_MENU_WIDTH}
      radius={PLAN_MENU_RADIUS}
      scrimLabel={t('chat.planMenu.close')}
      testID="plan-menu"
    >
      <View style={{ paddingVertical: theme.space.sm }}>
        {PLANS.map(id => {
          const current = id === plan;

          return (
            <MemoRow
              key={id}
              icon={PLAN_GLYPH[id]}
              label={t(`chat.plan.${id}`)}
              // A plan row is not a switch — entitlement is server-side, so the
              // row opens the plan comparison rather than mutating the store.
              onPress={() => {
                onDismiss();
                onAction('plans');
              }}
              current={current}
              testID={`plan-menu-${id}`}
            />
          );
        })}

        <MemoRow
          icon={Coins01Icon}
          label={t('chat.planMenu.extra')}
          onPress={() => {
            onDismiss();
            onAction('extra');
          }}
          testID="plan-menu-extra"
        />
      </View>
    </Popover>
  );
}

function Row({
  icon,
  label,
  onPress,
  current = false,
  testID,
}: {
  icon: IconProps['icon'];
  label: string;
  onPress: () => void;
  current?: boolean;
  testID: string;
}): React.JSX.Element {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: current }}
      android_ripple={{ color: theme.color.accentSoft }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.md,
        paddingHorizontal: theme.space.lg,
        paddingVertical: theme.space.md,
      }}
      testID={testID}
    >
      <View
        style={{
          width: ITEM_CHIP,
          height: ITEM_CHIP,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.muted,
        }}
      >
        <Icon icon={icon} size={GLYPH_SIZE} color={current ? theme.color.accent : theme.color.textPrimary} />
      </View>

      <AppText
        style={{
          ...theme.type.body,
          flex: 1,
          color: current ? theme.color.accent : theme.color.textPrimary,
        }}
      >
        {label}
      </AppText>

      {current ? <Icon icon={CheckmarkCircle02Icon} size={GLYPH_SIZE} color={theme.color.accent} /> : null}
    </Pressable>
  );
}

/*
 * NOT memoised: each row is themed via inline `theme.color.*` reads, and
 * `React.memo` can short-circuit the re-render that re-evaluates those styles
 * on Fabric — the user's reported bug had themed fills on memo'd chat
 * components stuck on the previous palette. The plan card only renders four
 * rows, so the cost of re-running each on every parent render is negligible.
 */
const MemoRow = Row;
