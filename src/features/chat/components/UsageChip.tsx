import React from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';

import { formatCompact } from '@/shared/format';
import { usePlan } from '@/shared/plan';
import { useTheme } from '@/shared/theme';
import { useUsageStore } from '@/shared/usage';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';

const CHIP_PADDING_X = 10;
const CHIP_PADDING_Y = 4;
const DOT = 4;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type UsageChipProps = {
  onPress?: () => void;
  onBuyExtra?: () => void;
  expanded?: boolean;
  testID?: string;
};

function UsageChip({ onPress, onBuyExtra, expanded = false, testID }: UsageChipProps): React.JSX.Element {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const plan = usePlan();
  const requests = useUsageStore((state) => state.requests);
  const tokens = useUsageStore((state) => state.tokens);
  const limits = useUsageStore((state) => state.limits);

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
        <View
          style={{
            backgroundColor: theme.color.muted,
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
            <Icon icon={ArrowDown01Icon} size={10} color={theme.color.textPrimary} />
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
}

export default UsageChip;

function Meta({ children }: { children: string }): React.JSX.Element {
  const theme = useTheme();

  return (
    <AppText
      style={{
        ...theme.type.tag,
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