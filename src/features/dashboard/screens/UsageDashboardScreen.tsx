import React, { useCallback, useEffect, useMemo } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Award01Icon } from '@hugeicons/core-free-icons';
import { useShallow } from 'zustand/react/shallow';

import ModelUsageBar from '../components/ModelUsageBar';
import TierMixCard from '../components/TierMixCard';
import UsageGauge from '../components/UsageGauge';

import { formatCompact, formatCount, formatMonthLabel, formatPercent } from '@/shared/format';
import { usePlanStore } from '@/shared/plan';
import { useTheme } from '@/shared/theme';
import { modelBreakdown, usageRatio, useUsageStore } from '@/shared/usage';
import { getUsage } from '@/shared/usage/usageApi';
import { useTranslation } from '@/shared/i18n/useTranslation';
import AppButton from '@/shared/ui/AppButton';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import ScreenHeader from '@/shared/ui/ScreenHeader';

const CONTENT_WIDTH = 358;
const TIER_BADGE = 40;

export default function UsageDashboardScreen(): React.JSX.Element {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    plan,
    limits,
    periodStart,
    requests,
    tokens,
    byModel,
    isRefreshing,
    error,
  } = useUsageStore(useShallow((state) => ({
    plan: state.plan,
    limits: state.limits,
    periodStart: state.periodStart,
    requests: state.requests,
    tokens: state.tokens,
    byModel: state.byModel,
    isRefreshing: state.isRefreshing,
    error: state.error,
  })));
  const canUpgrade = plan === 'free';

  const refreshUsage = useCallback(async (showRefreshing = true) => {
    const store = useUsageStore.getState();
    if (showRefreshing) store.setRefreshing(true);
    try {
      const usage = await getUsage();
      store.setUsage({
        periodStart: Date.parse(usage.periodStart),
        plan: usage.plan,
        limits: usage.limits,
        requests: usage.requests,
        tokens: usage.tokens,
        byModel: usage.byModel,
      });
      usePlanStore.getState().setPlan(usage.plan);
    } catch {
      store.setError(t('dashboard.loadError'));
    } finally {
      if (showRefreshing) store.setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    refreshUsage(false).catch(() => undefined);
  }, [refreshUsage]);

  const breakdown = useMemo(() => modelBreakdown(byModel), [byModel]);
  const requestRatio = usageRatio(requests, limits.requests);
  const tokenRatio = usageRatio(tokens, limits.tokens);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <ScreenHeader title={t('dashboard.title')} fallbackHref="/profile" />

      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          paddingTop: theme.space.xl,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: theme.space.lg,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              refreshUsage().catch(() => undefined);
            }}
            tintColor={theme.color.accent}
            colors={[theme.color.accent]}
          />
        )}
      >
        <View style={{ width: '100%', maxWidth: CONTENT_WIDTH, gap: theme.space.lg }}>
          <View
            style={{
              gap: theme.space.md,
              padding: 17,
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.color.border,
              backgroundColor: theme.color.surface,
            }}
            testID="usage-tier-card"
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ gap: theme.space.xs }}>
                <AppText
                  style={{
                    ...theme.type.tag,
                    color: theme.color.textSecondary,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('dashboard.currentTier')}
                </AppText>
                <AppText style={{ ...theme.type.h4, color: theme.color.textPrimary }}>
                  {t(`chat.plan.${plan}Name`)}
                </AppText>
              </View>

              <View
                style={{
                  width: TIER_BADGE,
                  height: TIER_BADGE,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.color.surfaceInverse,
                }}
              >
                <Icon icon={Award01Icon} size={21} color={theme.color.textInverse} />
              </View>
            </View>

            {canUpgrade ? (
              <AppButton
                label={t('dashboard.upgradeCta')}
                onPress={() => router.push('/upgrade')}
                testID="usage-upgrade"
              />
            ) : null}
          </View>

          {error ? (
            <View
              style={{
                padding: theme.space.md,
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: theme.color.border,
                backgroundColor: theme.color.surface,
              }}
              testID="usage-error"
            >
              <AppText style={{ ...theme.type.caption, color: theme.color.textSecondary }}>
                {error}
              </AppText>
            </View>
          ) : null}

          <Card testID="usage-total-card">
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                paddingBottom: theme.space.md,
              }}
            >
              <AppText style={{ ...theme.type.h4, color: theme.color.textPrimary }}>
                {t('dashboard.totalUsage')}
              </AppText>

              <View
                style={{
                  paddingHorizontal: theme.space.sm,
                  paddingVertical: theme.space.xs,
                  borderRadius: theme.radius.sm,
                  backgroundColor: theme.color.surfaceInverse,
                }}
              >
                <AppText
                  style={{
                    ...theme.type.tag,
                    color: theme.color.textInverse,
                    textTransform: 'uppercase',
                  }}
                  testID="usage-period"
                >
                  {formatMonthLabel(periodStart, i18n.language)}
                </AppText>
              </View>
            </View>

            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <UsageGauge
                  ratio={requestRatio}
                  value={formatPercent(requestRatio, i18n.language)}
                  caption={t('dashboard.requestsMeter', {
                    used: formatCount(requests, i18n.language),
                    limit: formatCount(limits.requests, i18n.language),
                  })}
                  testID="usage-gauge-requests"
                />
              </View>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <UsageGauge
                  ratio={tokenRatio}
                  value={formatPercent(tokenRatio, i18n.language)}
                  caption={t('dashboard.tokensMeter', {
                    used: formatCount(tokens, i18n.language),
                    limit: formatCount(limits.tokens, i18n.language),
                  })}
                  testID="usage-gauge-tokens"
                />
              </View>
            </View>
          </Card>

          <Card testID="usage-breakdown-card">
            <AppText
              style={{ ...theme.type.h4, color: theme.color.textPrimary, paddingBottom: theme.space.xs }}
            >
              {t('dashboard.modelBreakdown')}
            </AppText>

            <View style={{ gap: theme.space.md }}>
              {breakdown.map((row) => (
                <ModelUsageBar
                  key={row.id}
                  row={row}
                  requests={t('dashboard.reqShort', {
                    value: formatCompact(row.requests, i18n.language),
                  })}
                  tokens={t('dashboard.tokensShort', {
                    value: formatCompact(row.tokens, i18n.language),
                  })}
                  testID={`usage-model-${row.id}`}
                />
              ))}
            </View>
          </Card>

          <TierMixCard />
        </View>
      </ScrollView>
    </View>
  );
}

function Card({
  children,
  testID,
}: {
  children: React.ReactNode;
  testID?: string;
}): React.JSX.Element {
  const theme = useTheme();

  return (
    <View
      style={{
        gap: theme.space.sm,
        padding: theme.space.lg,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.color.surface,
      }}
      testID={testID}
    >
      {children}
    </View>
  );
}
