import React, { useCallback, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { useAuthPalette } from '../palette';
import { AUTH_TYPE } from '../constants';

import { AppText } from '@/shared/ui/AppText';

/*
 * Segmented OTP input (Figma "Field" 135:1143 — four 48x56 cells, 2px border,
 * radius 12, gap 8). The active cell (the next one to fill) shows the accent
 * focus border; the rest show the strong-edge border.
 *
 * ONE real <TextInput>, not four. It is a single invisible field stretched over
 * the cells; the cells are pure display. This is the robust pattern for OTP on
 * RN — four separate inputs with manual focus juggling break on backspace, paste
 * and autofill. Because it is a normal input it gets OS one-time-code autofill
 * for free (iOS `oneTimeCode`, Android `sms-otp`).
 *
 * Controlled: the screen owns `value`; this only sanitises to digits and reports
 * completion.
 *
 * THEME: the auth subtree follows the adaptive theme (see src/features/auth/index.ts);
 * cell borders and digit colour come from `useAuthPalette()`.
 */
const CELL_WIDTH = 48;
const CELL_HEIGHT = 56;
const CELL_GAP = 8;
const CELL_RADIUS = 12;

type Props = {
  value: string;
  onChangeText: (next: string) => void;
  length?: number;
  onComplete?: (code: string) => void;
  autoFocus?: boolean;
  accessibilityLabel?: string;
};

export default function OtpInput({
  value,
  onChangeText,
  length = 4,
  onComplete,
  autoFocus = false,
  accessibilityLabel,
}: Props): React.JSX.Element {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const palette = useAuthPalette();

  const handleChange = useCallback(
    (raw: string) => {
      const digits = raw.replace(/[^0-9]/g, '').slice(0, length);
      onChangeText(digits);
      if (digits.length === length) onComplete?.(digits);
    },
    [length, onChangeText, onComplete],
  );

  const focusInput = useCallback(() => inputRef.current?.focus(), []);

  return (
    <Pressable onPress={focusInput}>
      <View style={{ flexDirection: 'row', gap: CELL_GAP }}>
        {Array.from({ length }).map((_, i) => {
          // Accent border on the single "next to fill" cell while focused.
          const isActive = focused && i === value.length && value.length < length;
          return (
            <View
              key={i}
              style={{
                width: CELL_WIDTH,
                height: CELL_HEIGHT,
                borderWidth: 2,
                borderColor: isActive ? palette.accentFocus : palette.edgeStrong,
                borderRadius: CELL_RADIUS,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText style={{ ...AUTH_TYPE.h4, color: palette.onSurface }}>{value[i] ?? ''}</AppText>
            </View>
          );
        })}
      </View>

      {/*
       * The real input: stretched invisibly over the cells so a tap anywhere
       * focuses it and the OS keyboard drives the value. caretHidden because the
       * cells are the visible affordance.
       */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        caretHidden
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        accessibilityLabel={accessibilityLabel}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0 }}
      />
    </Pressable>
  );
}
