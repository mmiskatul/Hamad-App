import React from 'react';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/shared/theme';
import { AppText } from './AppText';

/*
 * Radio option with a description (Figma new-project 144:1300): a 20pt radio,
 * 20pt gap, then a Body title over a Body/secondary explanation.
 *
 * The radio is DRAWN, not an icon: it is two concentric circles whose sizes and
 * colours come from tokens, so it stays crisp at any density and inherits the
 * palette. Hugeicons' circle glyphs would need a second glyph for the selected
 * state and would not match the 20/10 proportion in the design.
 *
 * The whole row is the touch target — a 20pt dot is well under the 44pt
 * minimum, and the description is the part people actually aim at.
 */
const RADIO_SIZE = 20;
const RADIO_DOT = 10;

export type RadioOptionProps = {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** Renders inert at 30% — Figma dims the scope option on Rename (152:1929). */
  disabled?: boolean;
  testID?: string;
};

const DISABLED_OPACITY = 0.3;

export default function RadioOption({
  label,
  description,
  selected,
  onPress,
  disabled = false,
  testID,
}: RadioOptionProps): React.JSX.Element {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={description ? `${label}. ${description}` : label}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 20,
        opacity: disabled ? DISABLED_OPACITY : 1,
      }}
      testID={testID}
    >
      <View style={{ paddingTop: theme.space.sm }}>
        <View
          style={{
            width: RADIO_SIZE,
            height: RADIO_SIZE,
            borderRadius: RADIO_SIZE / 2,
            borderWidth: 1.5,
            borderColor: selected ? theme.color.textPrimary : theme.color.borderStrong,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selected ? (
            <View
              style={{
                width: RADIO_DOT,
                height: RADIO_DOT,
                borderRadius: RADIO_DOT / 2,
                backgroundColor: theme.color.textPrimary,
              }}
            />
          ) : null}
        </View>
      </View>

      <View style={{ flex: 1, gap: theme.space.sm }}>
        <AppText style={{ ...theme.type.body, color: theme.color.textPrimary }}>{label}</AppText>
        {description ? (
          <AppText style={{ ...theme.type.body, color: theme.color.textSecondary }}>
            {description}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}
