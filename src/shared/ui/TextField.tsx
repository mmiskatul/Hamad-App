import React, { useCallback, useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/shared/theme';
import { AppText } from './AppText';

/*
 * The adaptive app's text field, in the two skins the Core screens use:
 *
 *   outlined → transparent fill + 1px border/strong (Figma edit-profile
 *              142:1022, contact-support 140:2062)
 *   filled   → bg/surface fill, no border (Figma new-project 144:1283,
 *              rename-project 152:1927, instructions 152:1964)
 *
 * Both share 12pt radius, Body text and the focus behaviour, so they are one
 * component with a `variant` rather than two files that drift apart.
 *
 * The optional `label` renders as Figma's NOTCH — a small uppercase Label chip
 * (11/15, +0.66 tracking) sitting ON the top border, 32pt in from the start
 * edge, painted with the canvas colour so it cuts the border rather than
 * floating over it. It is not a floating placeholder: the design shows it
 * pinned, present whether or not the field has a value, so it does not animate.
 * It belongs to the outlined variant — a filled box has no border to notch.
 *
 * The focus tone matches the auth field's rule — border/focus while focused —
 * so the two halves of the app behave the same even though they do not share a
 * palette. There is no error state here yet: nothing validates inline, and an
 * unused state is an untested state.
 *
 * RTL: `textAlign` stays RN's default `auto` (resolves to the writing
 * direction; RN has no `textAlign: 'start'`), and the notch is offset with
 * `start`, so the field mirrors under Arabic.
 */
const FIELD_RADIUS = 12;
const FIELD_PADDING = 16;
/* Figma's filled boxes are 19pt in from the edges, not 16. */
const FILLED_PADDING_X = 19;
const NOTCH_START = 32;
/* Vertical room the notch needs above the border it sits on. */
const NOTCH_RESERVE = 12;

export type TextFieldVariant = 'outlined' | 'filled';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  /** Uppercase notch label on the top border. Outlined variant only. */
  label?: string;
  variant?: TextFieldVariant;
  /** Grow to fill the remaining space in a column (the message body). */
  fill?: boolean;
  /** Fixed box height — the instructions editor is 224pt in Figma. */
  height?: number;
  testID?: string;
};

export default function TextField({
  label,
  variant = 'outlined',
  fill = false,
  height,
  multiline,
  onFocus,
  onBlur,
  testID,
  ...rest
}: TextFieldProps): React.JSX.Element {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
    (event) => {
      setFocused(true);
      onFocus?.(event);
    },
    [onFocus],
  );

  const handleBlur = useCallback<NonNullable<TextInputProps['onBlur']>>(
    (event) => {
      setFocused(false);
      onBlur?.(event);
    },
    [onBlur],
  );

  const outlined = variant === 'outlined';
  /* The filled box shows focus as a ring, since it has no resting border. */
  const borderColor = outlined
    ? focused
      ? theme.color.borderFocus
      : theme.color.borderStrong
    : focused
      ? theme.color.borderFocus
      : 'transparent';

  return (
    <View
      style={{
        width: '100%',
        flex: fill ? 1 : undefined,
        paddingTop: label && outlined ? NOTCH_RESERVE : 0,
      }}
    >
      <View
        style={{
          flex: fill ? 1 : undefined,
          height,
          paddingVertical: FIELD_PADDING,
          paddingHorizontal: outlined ? FIELD_PADDING : FILLED_PADDING_X,
          borderRadius: FIELD_RADIUS,
          borderWidth: 1,
          borderColor,
          backgroundColor: outlined ? 'transparent' : theme.color.surface,
        }}
      >
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.color.textSecondary}
          selectionColor={theme.color.accent}
          multiline={multiline}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{
            ...theme.type.body,
            flex: fill ? 1 : undefined,
            color: theme.color.textPrimary,
            // Strip Android's default inner padding so the 16pt box padding holds.
            padding: 0,
            // A multiline input on Android centres its first line without this.
            textAlignVertical: multiline ? 'top' : 'center',
          }}
          testID={testID}
          {...rest}
        />
      </View>

      {label && outlined ? (
        <View
          style={{
            position: 'absolute',
            top: 0,
            start: NOTCH_START,
            paddingHorizontal: theme.space.sm,
            paddingVertical: theme.space.xs,
            backgroundColor: theme.color.canvas,
          }}
          pointerEvents="none"
        >
          <AppText
            style={{
              ...theme.type.tag,
              color: theme.color.textSecondary,
              textTransform: 'uppercase',
            }}
          >
            {label}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
