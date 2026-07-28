import React from 'react';
import { View } from 'react-native';

import { useAuthPalette } from '../palette';
import { AUTH_TYPE } from '../constants';

import { AppText } from '@/shared/ui/AppText';

/*
 * "line — OR — line" divider (Figma "Divider Field", nodes 134:989 / 135:1013).
 * Two 1px rules flanking an uppercase label. Extracted the moment it earned a
 * second use: it now appears on BOTH the onboarding and login screens, and the
 * two copies had to stay identical.
 *
 * The label defaults to the shared "OR" string but is a prop so a screen can
 * pass its own localized key.
 *
 * THEME: the auth subtree follows the adaptive theme (see src/features/auth/index.ts).
 */
const DIVIDER_GAP = 16; // Figma gap: line → label → line

type Props = {
  label: string;
};

export default function AuthDivider({ label }: Props): React.JSX.Element {
  const palette = useAuthPalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: DIVIDER_GAP }}>
      <View style={{ flex: 1, height: 1, backgroundColor: palette.edgeStrong }} />
      <AppText style={{ ...AUTH_TYPE.tag, color: palette.onSurface, textTransform: 'uppercase' }}>
        {label}
      </AppText>
      <View style={{ flex: 1, height: 1, backgroundColor: palette.edgeStrong }} />
    </View>
  );
}
