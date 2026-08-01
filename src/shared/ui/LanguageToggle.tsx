import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';

import { changeLanguage, type SupportedLanguage } from '@/shared/i18n';
import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from './AppText';

/*
 * EN | AR segmented pill (Figma node 113:2120, "Language Selector").
 *
 * Promoted out of features/auth when the chat drawer needed the same control:
 * two features cannot import each other, and the switch is the same interaction
 * in both places — only the palette differs. The palette is therefore a PROP,
 * which is what lets the fixed-dark auth screens and the adaptive app screens
 * share one implementation without either owning the other's colours.
 *
 * TWO SIZES, both from Figma:
 *   'default' (auth 113:2120)  — fixed 90×32, each option exactly 45 wide.
 *   'compact' (drawer 406:2823) — intrinsic width, 14/6 padding per option.
 *
 * The compact one is NOT the default one scaled down: the drawer footer sits it
 * between two 52pt pills on a 318-wide panel, so it has to size to its content
 * rather than claim a fixed 90. A fixed width there is what pushed it up against
 * the sign-out button.
 *
 * Both: 1px container border, radius 8, transparent fill; the active option
 * carries a 1px accent border and accent text.
 *
 * Tap calls changeLanguage(), which (if the writing direction changed) reloads
 * via expo-updates so I18nManager.forceRTL takes effect.
 */
const TOGGLE_WIDTH = 90;
const TOGGLE_HEIGHT = 32;
const TOGGLE_RADIUS = 8;
const COMPACT_PADDING_X = 14;
const COMPACT_PADDING_Y = 6;

export type LanguageToggleSize = 'default' | 'compact';

export type LanguageTogglePalette = {
  /** Container hairline. */
  border: string;
  /** Border around the selected option. */
  activeBorder: string;
  /** Label of the selected option. */
  activeText: string;
  /** Label of the unselected option. */
  inactiveText: string;
  /** Android ripple. */
  ripple: string;
};

export type LanguageToggleProps = {
  palette: LanguageTogglePalette;
  /** Type style for the labels — auth passes AUTH_TYPE.caption, app passes theme.type.caption. */
  labelStyle?: Record<string, unknown>;
  size?: LanguageToggleSize;
  testID?: string;
};

export default function LanguageToggle({
  palette,
  labelStyle,
  size = 'default',
  testID,
}: LanguageToggleProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const current = (i18n.language?.startsWith('ar') ? 'ar' : 'en') as SupportedLanguage;

  const pick = useCallback(
    (lng: SupportedLanguage) => {
      if (lng === current) return;
      changeLanguage(lng).catch(() => {
        /* swallow — toggle is best-effort; i18next falls back to the key on failure */
      });
    },
    [current],
  );

  const compact = size === 'compact';

  return (
    <View
      style={{
        // Compact sizes to its content; default keeps the fixed Figma box.
        width: compact ? undefined : TOGGLE_WIDTH,
        height: compact ? undefined : TOGGLE_HEIGHT,
        alignSelf: compact ? 'flex-start' : undefined,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: TOGGLE_RADIUS,
        backgroundColor: 'transparent',
      }}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('common.language.label')}
      testID={testID}
    >
      <ToggleItem
        label={t('common.language.en')}
        active={current === 'en'}
        palette={palette}
        labelStyle={labelStyle}
        compact={compact}
        onPress={() => pick('en')}
        testID={testID ? `${testID}-en` : undefined}
      />
      <ToggleItem
        label={t('common.language.ar')}
        active={current === 'ar'}
        palette={palette}
        labelStyle={labelStyle}
        compact={compact}
        onPress={() => pick('ar')}
        testID={testID ? `${testID}-ar` : undefined}
      />
    </View>
  );
}

function ToggleItem({
  label,
  active,
  palette,
  labelStyle,
  compact,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  palette: LanguageTogglePalette;
  labelStyle?: Record<string, unknown>;
  compact: boolean;
  onPress: () => void;
  testID?: string;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      // Ripple is clipped to the option's 8pt radius by `overflow: 'hidden'`.
      android_ripple={{ color: palette.ripple }}
      style={{
        width: compact ? undefined : TOGGLE_WIDTH / 2,
        height: compact ? undefined : TOGGLE_HEIGHT,
        paddingHorizontal: compact ? COMPACT_PADDING_X : 0,
        paddingVertical: compact ? COMPACT_PADDING_Y : 0,
        alignItems: 'center',
        justifyContent: 'center',
        // The inactive option keeps a TRANSPARENT border rather than none, so
        // selecting it cannot resize the row by a pixel on each side.
        borderWidth: 1,
        borderColor: active ? palette.activeBorder : 'transparent',
        borderRadius: TOGGLE_RADIUS,
        overflow: 'hidden',
      }}
      hitSlop={4}
      testID={testID}
    >
      <AppText
        style={{ ...labelStyle, color: active ? palette.activeText : palette.inactiveText }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
