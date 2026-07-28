import React, { useCallback } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SquareLock01Icon, Tick01Icon } from '@hugeicons/core-free-icons';

import { MODELS, isModelAllowed, type ModelId, type ModelInfo } from '../constants';

import { usePlan } from '@/shared/plan';
import { useTheme } from '@/shared/theme';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';
import Popover, { type PopoverAnchor, type PopoverOrigin } from '@/shared/ui/Popover';

/*
 * Model picker (Figma 404:1831), hanging off the top bar's model pill.
 *
 * IT IS AN ANCHORED CARD, NOT A BOTTOM SHEET. The control is a pill with a
 * chevron at the TOP of the screen; a surface that flies up from the bottom edge
 * has no visible relationship to it. It now grows out of the pill like every
 * other menu in the app (ChatMenu, AttachmentMenu, PlanMenu).
 *
 * DYNAMIC BY CONSTRUCTION, in both axes:
 *   - the top comes from the safe-area inset plus the bar's own geometry, which
 *     is what actually varies between devices (notch, punch-hole, none);
 *   - the height is whatever is left between the card's top and the bottom
 *     inset, capped so the list scrolls instead of running off a short screen.
 * Six rows do not fit on an iPhone SE the way they fit on a Pro Max, and a menu
 * that overflows the screen loses its last rows with no way to reach them.
 *
 * Locked rows do NOT select — they route to the upgrade screen, because the plan
 * matrix is enforced server-side (backend/src/ai/routing.service.ts) and letting
 * the client select a model the server will refuse just produces a failed send.
 *
 * Each row's avatar is the vendor's brand mark (user-supplied .svg in
 * assets/brand, carried on the model via `model.logo`) on the 52pt bg/muted
 * circle.
 */
const SCREEN_PADDING = 16;
/* Standard chat top bar geometry — mirrors the screens' own layout constants. */
const BAR_TOP = 22;
const BAR_HEIGHT = 52;
/** Widest the card is allowed to get on a tablet — a full-bleed list reads as a page. */
const MAX_WIDTH = 420;
const MENU_RADIUS = 24;
/** Gap between the model pill and the card that grows off it. */
const MENU_GAP = 8;
/** Never leave less than this below the card — a list flush to the edge looks cut. */
const BOTTOM_CLEARANCE = 24;
/** Below which a scrolling list is uselessly short; flip above the bar instead. */
const MIN_LIST_HEIGHT = 220;

export type ModelMenuProps = {
  visible: boolean;
  onDismiss: () => void;
  selected: ModelId;
  onSelect: (model: ModelId) => void;
  onUpgrade: () => void;
  /**
   * Distance from the top of the screen to the BOTTOM of the model pill. Screens
   * pass their own bar geometry; the default matches the standard chat top bar.
   */
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

  // The bar's own bottom edge, from the inset up — see the header.
  const top = (barBottom ?? insets.top + BAR_TOP + BAR_HEIGHT) + MENU_GAP;
  const spaceBelow = windowHeight - top - insets.bottom - BOTTOM_CLEARANCE;

  /*
   * Landscape, a split-screen window or a very short device can leave less room
   * under the bar than a usable list needs. Then the card is pinned to the
   * bottom inset instead and takes the whole safe area — still anchored, but no
   * longer hanging off a bar that has crowded it out.
   */
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

        {/*
          Bounded, not flexed: the card sizes to its content, so the cap has to
          live on the list itself or the ScrollView collapses to zero height.
        */}
        <ScrollView
          style={{ maxHeight: listMaxHeight }}
          showsVerticalScrollIndicator={false}
          testID="model-menu-list"
        >
          {MODELS.map((model) => (
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

  /*
   * TWO INDEPENDENT SIGNALS (Figma 404:1831):
   *   - HIGHLIGHT (elevated bg/surface card + elevation/1 shadow) marks a model
   *     as AVAILABLE on the current plan — the ones the user may switch between.
   *     Locked models stay flat on the bg/canvas sheet with a Pro/Business chip.
   *   - the TICK marks the ONE model currently in use. A user runs one model at a
   *     time; picking another swaps the tick, it does not multi-select.
   */
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
        // The bg/surface fill on the bg/canvas sheet IS the highlight. (Figma's
        // elevation/1 shadow is dropped: `overflow: hidden` — required to clip the
        // ripple to the 24pt corners — masks the shadow on iOS, and the fill
        // contrast already reads as "raised". A 5%-alpha shadow was noise anyway.)
        backgroundColor: allowed ? theme.color.surface : 'transparent',
        overflow: 'hidden',
      }}
      testID={`model-row-${model.id}`}
    >
      {/* Vendor brand mark on the 52pt bg/muted circle (Figma 404:1831). */}
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
