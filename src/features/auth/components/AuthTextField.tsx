import React, { useCallback, useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { ViewIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons';

import { useAuthPalette } from '../palette';
import { AUTH_TYPE } from '../constants';

import { useTranslation } from '@/shared/i18n/useTranslation';
import { AppText } from '@/shared/ui/AppText';
import { Icon } from '@/shared/ui/Icon';

/*
 * Auth text field with the three states the design calls for (Figma login field
 * 135:1056 — transparent fill, 1px border, radius 12):
 *
 *   - rest    → 1px borderStrong border (theme-driven), matching the design
 *   - focused → 1px accentFocus (borderFocus token) border, the brand CTA/focus
 *               tone — per the user's interaction rule: tapping in highlights
 *               the CTA colour
 *   - error   → 1px danger border + message below, and error OUTRANKS focus so
 *               an invalid field stays visibly invalid while being corrected
 *
 * Error state is driven by the `error` prop, not by internal validation: the
 * owning form decides what is invalid and when (on blur, on submit), which keeps
 * this component reusable across Login and Signup.
 *
 * RTL: text alignment is left at RN's default `auto`, which resolves to the
 * writing direction (left under EN, right under AR) — note RN has no
 * `textAlign: 'start'`, unlike the layout props. Spacing uses paddingHorizontal
 * rather than left/right so the field flips correctly under Arabic.
 *
 * THEME: the auth subtree follows the adaptive theme (see src/features/auth/index.ts);
 * every fill / label colour comes from `useAuthPalette()`.
 */
const FIELD_HEIGHT = 52;
const FIELD_RADIUS = 12;

type Props = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label?: string;
  /* Message to show below the field. Its presence is what puts it in error state. */
  error?: string;
  /*
   * Render a show/hide eye toggle and start masked (Figma password field
   * 135:2008). When set, this owns secureTextEntry — do not also pass it.
   */
  secureToggle?: boolean;
};

export default function AuthTextField({
  label,
  error,
  secureToggle = false,
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}: Props): React.JSX.Element {
  const { t } = useTranslation();
  const palette = useAuthPalette();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // secureToggle owns masking; otherwise honour a caller-passed secureTextEntry.
  const masked = secureToggle ? !revealed : secureTextEntry;

  const toggleReveal = useCallback(() => setRevealed(r => !r), []);

  const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
    event => {
      setFocused(true);
      onFocus?.(event);
    },
    [onFocus],
  );

  const handleBlur = useCallback<NonNullable<TextInputProps['onBlur']>>(
    event => {
      setFocused(false);
      onBlur?.(event);
    },
    [onBlur],
  );

  // Error outranks focus — a field being corrected must keep reading as invalid.
  const borderColor = error ? palette.danger : focused ? palette.accentFocus : palette.edgeStrong;

  return (
    <View style={{ width: '100%', gap: 6 }}>
      {label ? <AppText style={{ ...AUTH_TYPE.caption, color: palette.onSurface }}>{label}</AppText> : null}

      <View
        style={{
          height: FIELD_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 16,
          borderRadius: FIELD_RADIUS,
          borderWidth: 1,
          borderColor,
          // Transparent fill per Figma — the field is an outline on the canvas,
          // not a filled surface.
          backgroundColor: 'transparent',
        }}
      >
        <TextInput
          accessibilityLabel={label}
          accessibilityState={{ disabled: rest.editable === false }}
          placeholderTextColor={palette.muted}
          selectionColor={palette.accentFocus}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={masked}
          style={{
            ...AUTH_TYPE.body,
            flex: 1,
            color: palette.onSurface,
            padding: 0, // strip Android's default inner padding so the 52 height holds
          }}
          {...rest}
        />
        {secureToggle ? (
          <Pressable
            onPress={toggleReveal}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t(revealed ? 'auth.field.hidePassword' : 'auth.field.showPassword')}
          >
            <Icon icon={revealed ? ViewOffSlashIcon : ViewIcon} size={24} color={palette.onSurface} />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <AppText accessibilityRole="alert" style={{ ...AUTH_TYPE.caption, color: palette.danger }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
