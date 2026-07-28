import React from 'react';
import { I18nManager, Pressable, View } from 'react-native';
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  LogoutSquare01Icon,
} from '@hugeicons/core-free-icons';

import { useTheme } from '@/shared/theme';
import { AppText } from '@/shared/ui/AppText';
import { Icon, type IconProps } from '@/shared/ui/Icon';

/*
 * The settings list row (Figma Profile 140:1693 and About 140:1878 — the same
 * component in both): bg/surface card, 12pt radius, 8pt padding, a 44pt icon
 * box + label on the start edge and a 44pt affordance box on the end edge.
 *
 * The trailing affordance IS the row's contract, so it is a prop rather than
 * something each caller draws:
 *   chevron → pushes a screen (mirrors under RTL: it points "forward")
 *   expand  → opens IN PLACE; `expanded` rotates nothing, it swaps nothing —
 *             the children render inside this same card, so the card grows
 *   logout  → the one destructive row, in the danger tone
 *   none    → inert row
 *
 * A row with `children` and `expanded` keeps them INSIDE the surface card
 * instead of below it: the expanded options belong to the row that opened them,
 * and a detached panel underneath reads as a separate, unrelated card.
 */
const ROW_RADIUS = 12;
const ROW_PADDING = 8;
const SLOT_SIZE = 44;
const GLYPH_SIZE = 20;

export type SettingRowTrailing = 'chevron' | 'expand' | 'logout' | 'none';

export type SettingRowProps = {
  label: string;
  /** 20pt leading glyph. Omit for a label-only row (Logout). */
  icon?: IconProps['icon'];
  /** Caption under the label — the plan name on "Upgrade my Plan". */
  caption?: string;
  trailing?: SettingRowTrailing;
  onPress?: () => void;
  /** With `children`: whether the in-card panel is open. */
  expanded?: boolean;
  children?: React.ReactNode;
  testID?: string;
};

export default function SettingRow({
  label,
  icon,
  caption,
  trailing = 'chevron',
  onPress,
  expanded = false,
  children,
  testID,
}: SettingRowProps): React.JSX.Element {
  const theme = useTheme();

  // "Forward" is a direction, not a glyph — it flips with the writing direction.
  const forwardIcon = I18nManager.isRTL ? ArrowLeft01Icon : ArrowRight01Icon;

  return (
    <View
      style={{
        width: '100%',
        borderRadius: ROW_RADIUS,
        backgroundColor: theme.color.surface,
        overflow: 'hidden',
      }}
      testID={testID}
    >
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={caption ? `${label}, ${caption}` : label}
        accessibilityState={trailing === 'expand' ? { expanded } : undefined}
        android_ripple={{ color: theme.color.accentSoft }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: ROW_PADDING,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.xs, flex: 1 }}>
          {icon ? (
            <View
              style={{ width: SLOT_SIZE, height: SLOT_SIZE, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon icon={icon} size={GLYPH_SIZE} color={theme.color.textPrimary} />
            </View>
          ) : (
            // Label-only rows (Logout) start at the icon box's text offset, so
            // every label in the list shares one vertical line.
            <View style={{ width: 20 }} />
          )}

          <View style={{ flex: 1, gap: theme.space.xs }}>
            <AppText style={{ ...theme.type.body, color: theme.color.textPrimary }}>
              {label}
            </AppText>
            {caption ? (
              <AppText style={{ ...theme.type.caption, color: theme.color.textSecondary }}>
                {caption}
              </AppText>
            ) : null}
          </View>
        </View>

        {trailing === 'none' ? null : (
          <View
            style={{ width: SLOT_SIZE, height: SLOT_SIZE, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon
              icon={
                trailing === 'logout'
                  ? LogoutSquare01Icon
                  : trailing === 'expand'
                    ? ArrowDown01Icon
                    : forwardIcon
              }
              size={GLYPH_SIZE}
              color={trailing === 'logout' ? theme.color.danger : theme.color.textPrimary}
            />
          </View>
        )}
      </Pressable>

      {children && expanded ? (
        <View style={{ paddingHorizontal: theme.space.lg, paddingBottom: theme.space.lg }}>
          {children}
        </View>
      ) : null}
    </View>
  );
}
