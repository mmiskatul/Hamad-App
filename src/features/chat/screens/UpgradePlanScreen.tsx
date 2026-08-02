import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft01Icon, CheckmarkCircle02Icon, Zap } from '@hugeicons/core-free-icons';

import RequestExtraCard from '../components/RequestExtraCard';
import { BILLING_PERIODS, PLAN_CARDS, type BillingPeriod, type PlanCard } from '../constants';

import { usePlan, type Plan } from '@/shared/plan';
import { updateAccountPlan } from '@/shared/plan/planApi';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import Dialog from '@/shared/ui/Dialog';
import { Icon } from '@/shared/ui/Icon';

/*
 * Upgrade screen (Figma 404:1024 "Upgrade my plan"), presented modally from the
 * chat home's Upgrade chip, the drawer's plan chip, and the after-2-prompts
 * upsell.
 *
 * Figma: back pill top-start, "Upgrade my Plan" title, centred "Choose your AI
 * power level" + a 3-way billing segmented control (accent pill marks the
 * selection), then one card per plan — 16pt radius, 0.8pt border, except Pro
 * which is emphasised with a 1.6pt accent border and a stronger shadow.
 *
 * CTA per card follows the user's CURRENT plan: their own plan renders as an
 * inert "Current Plan" on the inverse surface; higher plans get a solid accent
 * CTA (Pro and Business both). Prices/limits mirror the root CLAUDE.md plan
 * matrix, and the real entitlement always comes from the server.
 *
 * TODO(backend): billing period must reprice the cards (annual ≠ monthly × 12)
 * and the CTAs must open the store purchase flow.
 */
const CONTENT_WIDTH = 358;
const CARD_RADIUS = 16;

export default function UpgradePlanScreen(): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  /*
   * `?period=extra` opens straight on the top-up tab. The out-of-quota upsell
   * under the composer sends the user here, and it would be a bait-and-switch to
   * answer "buy more!" with the plan cards they already bought from.
   */
  const { period: requested } = useLocalSearchParams<{ period?: string }>();
  const initialPeriod = BILLING_PERIODS.includes(requested as BillingPeriod)
    ? (requested as BillingPeriod)
    : 'monthly';

  const [period, setPeriod] = useState<BillingPeriod>(initialPeriod);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const selectPeriod = useCallback((next: BillingPeriod) => {
    setPeriod(next);
    setSelectedPlan(null);
    setPlanError(null);
  }, []);

  const selectPlan = useCallback((next: Plan) => {
    setSelectedPlan(next);
    setPlanError(null);
  }, []);

  const confirmPlan = useCallback(async () => {
    if (!selectedPlan || isConfirming) return;
    setIsConfirming(true);
    setPlanError(null);
    try {
      await updateAccountPlan(selectedPlan);
      setSelectedPlan(null);
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : t('chat.upgrade.changeError'));
    } finally {
      setIsConfirming(false);
    }
  }, [isConfirming, selectedPlan, t]);

  const onBack = useCallback(() => {
    // Modal route: pop it if we can, otherwise fall back to home so a deep link
    // into /upgrade is not a dead end.
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/home');
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.canvas }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + theme.space.lg,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: theme.space.lg,
          alignItems: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header: back pill + title */}
        <View
          style={{
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.space.lg,
          }}
        >
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            android_ripple={{ color: theme.color.accentSoft }}
            style={{
              width: 52,
              height: 52,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: theme.radius.pill,
              backgroundColor: theme.color.muted,
              overflow: 'hidden',
            }}
            testID="upgrade-back"
          >
            {/* Direction glyph — mirrors with the writing direction. */}
            <Icon icon={ArrowLeft01Icon} size={24} color={theme.color.textPrimary} />
          </Pressable>
          <AppText style={{ ...theme.type.h4, color: theme.color.textPrimary }}>
            {t('chat.upgrade.title')}
          </AppText>
        </View>

        {/* Pitch + billing period */}
        <View style={{ width: '100%', maxWidth: CONTENT_WIDTH, paddingTop: 32, gap: theme.space.xl }}>
          <AppText
            style={{ ...theme.type.h4, color: theme.color.textPrimary, textAlign: 'center' }}
          >
            {t('chat.upgrade.headline')}
          </AppText>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: theme.space.sm,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.color.surface,
            }}
          >
            {BILLING_PERIODS.map((option) => {
              const active = option === period;
              return (
                <Pressable
                  key={option}
                  onPress={() => selectPeriod(option)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingHorizontal: theme.space.xl,
                    paddingVertical: theme.space.sm,
                    borderRadius: theme.radius.pill,
                    backgroundColor: active ? theme.color.accent : 'transparent',
                  }}
                  testID={`billing-${option}`}
                >
                  <AppText
                    style={{
                      ...theme.type.caption,
                      color: active ? theme.color.textOnAccent : theme.color.textSecondary,
                    }}
                  >
                    {t(`chat.upgrade.period.${option}`)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/*
          Plan cards — or, on the third segment, the top-up card. "Req. Extra"
          (Figma 281:898) is not a billing FREQUENCY like the other two; it sells
          extra quota on the plan you already have, so it replaces the cards
          rather than repricing them.
        */}
        <View style={{ width: '100%', maxWidth: CONTENT_WIDTH, paddingTop: 32, gap: theme.space.lg }}>
          {period === 'extra' ? (
            <RequestExtraCard />
          ) : (
            <>
              {PLAN_CARDS.map((card) => (
                <PlanArticle
                  key={card.id}
                  card={card}
                  selected={selectedPlan === card.id}
                  disabled={isConfirming}
                  onSelect={selectPlan}
                />
              ))}
            </>
          )}
        </View>
      </ScrollView>

      <PlanConfirmation
        visible={selectedPlan !== null}
        plan={selectedPlan ?? 'free'}
        loading={isConfirming}
        error={planError}
        onConfirm={confirmPlan}
        onCancel={() => setSelectedPlan(null)}
      />
    </View>
  );
}

function PlanArticle({
  card,
  selected,
  disabled,
  onSelect,
}: {
  card: PlanCard;
  selected: boolean;
  disabled: boolean;
  onSelect: (plan: Plan) => void;
}): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();

  const plan = usePlan();

  const isCurrent = card.id === plan;
  // Pro is the recommended tier and carries the accent border (Figma 404:1084).
  const emphasised = card.id === 'pro';

  return (
    <View
      style={{
        backgroundColor: theme.color.surface,
        borderRadius: CARD_RADIUS,
        borderWidth: selected || emphasised ? 1.6 : 0.8,
        borderColor: selected || emphasised ? theme.color.borderFocus : theme.color.border,
        padding: 26,
      }}
      testID={`plan-card-${card.id}`}
    >
      <AppText
        style={{
          ...theme.type.body,
          color: emphasised ? theme.color.accent : theme.color.textPrimary,
        }}
      >
        {t(`chat.plan.${card.id}Name`)}
      </AppText>

      {/* Price + period, baseline-aligned as in the design. */}
      <View
        style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.space.xs, paddingTop: 4 }}
      >
        <AppText style={{ ...theme.type.h3, color: theme.color.textPrimary }}>
          {card.price}
        </AppText>
        <AppText style={{ ...theme.type.caption, color: theme.color.textPrimary }}>
          {t('chat.upgrade.perMonth')}
        </AppText>
      </View>

      <AppText
        style={{ ...theme.type.body, color: theme.color.textSecondary, paddingTop: theme.space.lg }}
      >
        {t(`chat.upgrade.${card.id}.pitch`)}
      </AppText>

      <View style={{ paddingTop: theme.space.xl, paddingBottom: 32, gap: theme.space.md }}>
        {card.featureKeys.map((key) => (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.space.sm }}>
            <View style={{ paddingTop: 2 }}>
              <Icon icon={CheckmarkCircle02Icon} size={17} color={theme.color.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={{ ...theme.type.body, color: theme.color.textPrimary }}>
                {t(key)}
              </AppText>
              {card.footnoteKey && key === card.featureKeys[3] ? (
                <AppText
                  style={{
                    ...theme.type.tag,
                    color: theme.color.textSecondary,
                    textTransform: 'uppercase',
                  }}
                >
                  {t(card.footnoteKey)}
                </AppText>
              ) : null}
            </View>
          </View>
        ))}
      </View>

      <PlanCta plan={card.id} isCurrent={isCurrent} selected={selected} disabled={disabled} onSelect={onSelect} />
    </View>
  );
}

function PlanCta({
  plan,
  isCurrent,
  selected,
  disabled,
  onSelect,
}: {
  plan: PlanCard['id'];
  isCurrent: boolean;
  selected: boolean;
  disabled: boolean;
  onSelect: (plan: Plan) => void;
}): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();

  if (isCurrent) {
    return (
      <View
        style={{
          minHeight: 52,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radius.lg,
          backgroundColor: theme.color.surfaceInverse,
        }}
        accessibilityRole="text"
        testID={`plan-cta-${plan}`}
      >
        <AppText style={{ ...theme.type.body, color: theme.color.textInverse }}>
          {t('chat.upgrade.currentPlan')}
        </AppText>
      </View>
    );
  }

  // Both upgrade CTAs use the solid primary accent with on-accent text (Business
  // was previously the softer tinted variant; per request it now matches Pro).
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      android_ripple={{ color: theme.color.accentSoft }}
      style={{
        flexDirection: 'row',
        minHeight: 52,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.space.sm,
        borderRadius: theme.radius.lg,
        backgroundColor: theme.color.accent,
        overflow: 'hidden',
      }}
      testID={`plan-cta-${plan}`}
      onPress={() => onSelect(plan)}
    >
      <Icon icon={Zap} size={24} color={theme.color.textOnAccent} />
      <AppText style={{ ...theme.type.body, color: theme.color.textOnAccent }}>
        {t(`chat.upgrade.${plan}.cta`)}
      </AppText>
    </Pressable>
  );
}

function PlanConfirmation({
  visible,
  plan,
  loading,
  error,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  plan: Plan;
  loading: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const planName = t(`chat.plan.${plan}Name`);

  return (
    <Dialog
      visible={visible}
      onDismiss={loading ? () => undefined : onCancel}
      scrimLabel={t('chat.upgrade.cancel')}
      testID="plan-confirmation-dialog"
    >
      <View style={{ gap: theme.space.md }} testID="plan-confirmation">
        <AppText style={{ ...theme.type.h4, color: theme.color.textPrimary }}>
          {t('chat.upgrade.confirmTitle', { plan: planName })}
        </AppText>
        <AppText style={{ ...theme.type.body, color: theme.color.textSecondary }}>
          {t('chat.upgrade.confirmBody', { plan: planName })}
        </AppText>
        {error ? (
          <AppText
            style={{ ...theme.type.caption, color: theme.color.danger }}
            testID="plan-error"
          >
            {error}
          </AppText>
        ) : null}
        <Pressable
          disabled={loading}
          accessibilityRole="button"
          accessibilityState={{ disabled: loading }}
          onPress={onConfirm}
          style={{
            minHeight: 52,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: theme.radius.lg,
            backgroundColor: loading ? theme.color.muted : theme.color.accent,
          }}
          testID="plan-confirm"
        >
          <AppText
            style={{
              ...theme.type.body,
              color: loading ? theme.color.textSecondary : theme.color.textOnAccent,
            }}
          >
            {t(loading ? 'chat.upgrade.updating' : 'chat.upgrade.confirm')}
          </AppText>
        </Pressable>
        <Pressable
          disabled={loading}
          accessibilityRole="button"
          onPress={onCancel}
          style={{ alignItems: 'center', paddingVertical: theme.space.sm }}
          testID="plan-cancel"
        >
          <AppText style={{ ...theme.type.body, color: theme.color.textSecondary }}>
            {t('chat.upgrade.cancel')}
          </AppText>
        </Pressable>
      </View>
    </Dialog>
  );
}
