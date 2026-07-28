import React, { useMemo } from 'react';
import { View } from 'react-native';
import { InformationCircleIcon } from '@hugeicons/core-free-icons';

import { TIER_MIX, type TierMixRow } from './tierMixData';

import { formatCompact, formatCount, formatCurrency, formatPercent } from '@/shared/format';
import { type Plan } from '@/shared/plan';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';

/*
 * Tier mix card (Figma 142:496): a stacked bar chart showing the share of
 * paying users on each tier, then a four-column table (TIER / USERS / SHARE /
 * REVENUE) with a Total row at the bottom.
 *
 * The chart's bar is a single row of three segments — Free is the muted base,
 * Pro and Business stack on top — because the chart's purpose is "which tier is
 * everyone on", not "what's the colour of each tier". The table is where the
 * exact numbers live.
 *
 * Column widths are layout, not data: TIER flexes to fill the left, then
 * USERS / SHARE / REVENUE share the right half with explicit weights so the
 * columns line up with the header row.
 */
const BAR_HEIGHT = 12;
const ICON_HIT = 24;

const COL_TIER = 1;
const COL_USERS = 0.9;
const COL_SHARE = 0.7;
const COL_REVENUE = 1.1;

export default function TierMixCard(): React.JSX.Element {
  const theme = useTheme();
  const { t, i18n } = useTranslation();

  const { totalUsers, totalRevenue, shares } = useMemo(() => {
    const users = TIER_MIX.reduce((sum, row) => sum + row.users, 0);
    const revenue = TIER_MIX.reduce((sum, row) => sum + row.revenue, 0);
    const next: Record<Plan, number> = { free: 0, pro: 0, business: 0 };
    TIER_MIX.forEach((row) => {
      next[row.plan] = users > 0 ? row.users / users : 0;
    });
    return { totalUsers: users, totalRevenue: revenue, shares: next };
  }, []);

  return (
    <View
      style={{
        gap: theme.space.lg,
        padding: theme.space.lg,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.color.surface,
      }}
      testID="tier-mix-card"
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.space.sm,
        }}
      >
        <AppText style={{ ...theme.type.h4, color: theme.color.textPrimary }}>
          {t('dashboard.tierMix')}
        </AppText>
        <Icon
          icon={InformationCircleIcon}
          size={ICON_HIT}
          color={theme.color.textSecondary}
        />
      </View>

      {/*
        Chart canvas: 220pt tall, just enough to read as a "chart area" with
        the bar near the bottom. The empty upper portion is intentional — the
        card's purpose is the table, the bar is the at-a-glance.
      */}
      <View
        style={{
          height: 220,
          justifyContent: 'flex-end',
        }}
        testID="tier-mix-chart"
      >
        <View
          style={{
            flexDirection: 'row',
            height: BAR_HEIGHT,
            borderRadius: theme.radius.pill,
            overflow: 'hidden',
            backgroundColor: theme.color.muted,
          }}
          testID="tier-mix-bar"
        >
          {TIER_MIX.map((row) => (
            <View
              key={row.plan}
              style={{
                flex: row.users,
                backgroundColor: tierColor(row.plan, theme),
              }}
              testID={`tier-mix-bar-${row.plan}`}
            />
          ))}
        </View>
      </View>

      {/* Table header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: theme.space.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.color.border }} testID="tier-mix-header">
        <HeaderCell width={COL_TIER}>{t('dashboard.colTier')}</HeaderCell>
        <HeaderCell width={COL_USERS} align="end">
          {t('dashboard.colUsers')}
        </HeaderCell>
        <HeaderCell width={COL_SHARE} align="end">
          {t('dashboard.colShare')}
        </HeaderCell>
        <HeaderCell width={COL_REVENUE} align="end">
          {t('dashboard.colRevenue')}
        </HeaderCell>
      </View>

      {/* Body rows */}
      <View testID="tier-mix-rows">
        {TIER_MIX.map((row) => (
          <View
            key={row.plan}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: theme.space.sm }}
            testID={`tier-mix-row-${row.plan}`}
          >
            <Cell width={COL_TIER}>{t(`chat.plan.${row.plan}Name`)}</Cell>
            <Cell width={COL_USERS} align="end">
              {formatCount(row.users, i18n.language)}
            </Cell>
            <Cell width={COL_SHARE} align="end">
              {formatPercent(shares[row.plan], i18n.language)}
            </Cell>
            <Cell width={COL_REVENUE} align="end">
              {formatCurrency(row.revenue, i18n.language)}
            </Cell>
          </View>
        ))}
      </View>

      {/* Total row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: theme.space.sm,
          borderTopWidth: 1,
          borderColor: theme.color.border,
        }}
        testID="tier-mix-total"
      >
        <Cell width={COL_TIER} bold>
          {t('dashboard.total')}
        </Cell>
        <Cell width={COL_USERS} align="end" bold>
          {formatCompact(totalUsers, i18n.language)}
        </Cell>
        <Cell width={COL_SHARE} align="end" bold>
          {formatPercent(1, i18n.language)}
        </Cell>
        <Cell width={COL_REVENUE} align="end" bold>
          {formatCurrency(totalRevenue, i18n.language)}
        </Cell>
      </View>
    </View>
  );
}

/*
 * Tier ramp — accent (Pro, the paid-but-most-common) is the most saturated,
 * accentTint (Business) sits one notch muted, and Free is the muted base. The
 * card sits on bg/surface, so all three are picked from the same palette and
 * inherit the dark/light flip.
 */
function tierColor(plan: TierMixRow['plan'], theme: ReturnType<typeof useTheme>): string {
  switch (plan) {
    case 'free':
      return theme.color.muted;
    case 'pro':
      return theme.color.accent;
    case 'business':
      return theme.color.accentTint;
  }
}

function HeaderCell({
  children,
  width,
  align = 'start',
}: {
  children: string;
  width: number;
  align?: 'start' | 'end';
}): React.JSX.Element {
  const theme = useTheme();

  return (
    <View
      style={{
        flex: width,
        alignItems: align === 'end' ? 'flex-end' : 'flex-start',
      }}
    >
      <AppText
        style={{
          ...theme.type.tag,
          color: theme.color.textSecondary,
          textTransform: 'uppercase',
        }}
      >
        {children}
      </AppText>
    </View>
  );
}

function Cell({
  children,
  width,
  align = 'start',
  bold = false,
}: {
  children: string;
  width: number;
  align?: 'start' | 'end';
  bold?: boolean;
}): React.JSX.Element {
  const theme = useTheme();

  return (
    <View
      style={{
        flex: width,
        alignItems: align === 'end' ? 'flex-end' : 'flex-start',
      }}
    >
      <AppText
        style={{
          ...theme.type.body,
          color: theme.color.textPrimary,
          fontWeight: bold ? '700' : '400',
        }}
      >
        {children}
      </AppText>
    </View>
  );
}