import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SquareLock01Icon, Tick01Icon } from '@hugeicons/core-free-icons';

import { isModelAllowed, type ModelId, type ModelInfo, useModelCatalogue } from '@/shared/models';
import { usePlan } from '@/shared/plan';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import Popover, { type PopoverAnchor, type PopoverOrigin } from '@/shared/ui/Popover';

const SCREEN_PADDING = 16;
const BAR_TOP = 22;
const BAR_HEIGHT = 52;
const MAX_WIDTH = 420;
const MENU_RADIUS = 24;
const MENU_GAP = 8;
const BOTTOM_CLEARANCE = 24;
const MIN_LIST_HEIGHT = 220;

export type ModelMenuProps = {
  visible: boolean;
  onDismiss: () => void;
  selected: ModelId;
  onSelect: (model: ModelId) => void;
  onUpgrade: () => void;
  barBottom?: number;
};

export default function ModelMenu({
  visible,
  onDismiss,
  selected,
  onSelect,
  onUpgrade,
  barBottom,
}: ModelMenuProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const plan = usePlan();
  const models = useModelCatalogue();
  const visibleModels = useMemo(() => models.filter((model) => model.available), [models]);

  const handlePick = useCallback(
    (model: ModelInfo) => {
      if (!isModelAllowed(model, plan)) {
        onDismiss();
        onUpgrade();
        return;
      }
      onSelect(model.id);
      onDismiss();
    },
    [plan, onSelect, onDismiss, onUpgrade],
  );

  const width = Math.min(windowWidth - SCREEN_PADDING * 2, MAX_WIDTH);
  const top = (barBottom ?? insets.top + BAR_TOP + BAR_HEIGHT) + MENU_GAP;
  const spaceBelow = windowHeight - top - insets.bottom - BOTTOM_CLEARANCE;
  const dropsDown = spaceBelow >= MIN_LIST_HEIGHT;

  const anchor: PopoverAnchor = dropsDown
    ? { start: SCREEN_PADDING, top }
    : { start: SCREEN_PADDING, bottom: insets.bottom + BOTTOM_CLEARANCE };
  const origin: PopoverOrigin = dropsDown ? 'top-start' : 'bottom-start';

  const listMaxHeight = Math.max(
    MIN_LIST_HEIGHT,
    dropsDown
      ? spaceBelow
      : windowHeight - insets.top - insets.bottom - BOTTOM_CLEARANCE * 2,
  );

  return (
    <Popover
      visible={visible}
      onDismiss={onDismiss}
      anchor={anchor}
      origin={origin}
      width={width}
      radius={MENU_RADIUS}
      background={theme.color.canvas}
      scrimLabel={t('chat.modelSheet.close')}
      testID="model-menu"
    >
      <View style={{ paddingHorizontal: theme.space.md, paddingVertical: theme.space.md }}>
        <AppText
          style={{
            ...theme.type.tag,
            color: theme.color.textSecondary,
            textTransform: 'uppercase',
            paddingHorizontal: theme.space.md,
            paddingBottom: theme.space.md,
          }}
        >
          {t('chat.modelSheet.title')}
        </AppText>

        <ScrollView
          style={{ maxHeight: listMaxHeight }}
          showsVerticalScrollIndicator={false}
          testID="model-menu-list"
        >
          {visibleModels.map((model) => (
            <ModelRow
              key={model.id}
              model={model}
              selected={model.id === selected}
              onPress={() => handlePick(model)}
            />
          ))}
        </ScrollView>
      </View>
    </Popover>
  );
}

function ModelRow({
  model,
  selected,
  onPress,
}: {
  model: ModelInfo;
  selected: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const plan = usePlan();

  const allowed = isModelAllowed(model, plan);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !allowed }}
      accessibilityLabel={`${model.name} / ${model.vendor}`}
      android_ripple={{ color: theme.color.accentSoft }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.md,
        padding: theme.space.md,
        marginBottom: theme.space.sm,
        borderRadius: 24,
        backgroundColor: allowed ? theme.color.surface : 'transparent',
        overflow: 'hidden',
      }}
      testID={`model-row-${model.id}`}
    >
      <View
        style={{
          width: 52,
          height: 52,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.muted,
          overflow: 'hidden',
        }}
      >
        <model.logo width={28} height={28} color={theme.color.textPrimary} />
      </View>

      <View style={{ flex: 1, gap: theme.space.xs }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <AppText style={{ ...theme.type.body, color: theme.color.textPrimary }}>
            {model.name}
            <AppText style={{ ...theme.type.tag, color: theme.color.textSecondary }}>
              {` / ${model.vendor}`}
            </AppText>
          </AppText>

          {allowed ? null : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.space.sm,
                paddingHorizontal: theme.space.md,
                paddingVertical: 2,
                borderRadius: theme.radius.pill,
                borderWidth: 1,
                borderColor: theme.color.borderStrong,
              }}
            >
              <Icon icon={SquareLock01Icon} size={12} color={theme.color.textSecondary} />
              <AppText style={{ ...theme.type.caption, color: theme.color.textSecondary }}>
                {t(`chat.plan.${model.minPlan}Short`)}
              </AppText>
            </View>
          )}
        </View>

        <AppText style={{ ...theme.type.tag, color: theme.color.textSecondary }}>
          {t(model.descriptionKey)}
        </AppText>
      </View>

      {selected ? (
        <Icon icon={Tick01Icon} size={20} color={theme.color.success} testID="model-row-check" />
      ) : null}
    </Pressable>
  );
}