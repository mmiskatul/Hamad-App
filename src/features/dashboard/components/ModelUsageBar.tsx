import React from 'react';
import { View } from 'react-native';

import { type ModelBreakdownRow } from '@/shared/usage';
import { useTheme } from '@/shared/theme';
import { AppText } from '@/shared/ui/AppText';

/*
 * One row of the Model Breakdown section (Figma 140:2184 and its five clones):
 * an 8pt vendor-coloured dot, the model name, a "210 REQ • 5K TK" meta pair, and
 * an 8pt track whose fill takes the vendor colour.
 *
 * The dot and the fill share ONE colour — the model's brand hex from
 * @/shared/models. They are the only literal colours in the adaptive subtree,
 * and deliberately so: the dot's whole job is to identify a vendor, so it must
 * read the same in light and dark. Everything else here is a theme token.
 */
const DOT_SIZE = 8;
const TRACK_HEIGHT = 8;

export type ModelUsageBarProps = {
  row: ModelBreakdownRow;
  /** Pre-formatted "210 REQ" and "5K TK" halves — locale-aware at the caller. */
  requests: string;
  tokens: string;
  testID?: string;
};

export default function ModelUsageBar({
  row,
  requests,
  tokens,
  testID,
}: ModelUsageBarProps): React.JSX.Element {
  const theme = useTheme();

  return (
    <View style={{ gap: theme.space.xs }} testID={testID}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm, flex: 1 }}>
          <View
            style={{
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: DOT_SIZE / 2,
              backgroundColor: row.brandColor,
            }}
          />
          <AppText numberOfLines={1} style={{ ...theme.type.body, color: theme.color.textPrimary }}>
            {row.name}
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Meta>{requests}</Meta>
          {/* 3pt dot separator (Figma Ellipse 135). */}
          <View
            style={{
              width: 3,
              height: 3,
              borderRadius: 1.5,
              backgroundColor: theme.color.textSecondary,
            }}
          />
          <Meta>{tokens}</Meta>
        </View>
      </View>

      <View
        style={{
          height: TRACK_HEIGHT,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.color.muted,
          overflow: 'hidden',
        }}
        accessibilityRole="progressbar"
        accessibilityValue={{ now: Math.round(row.share * 100), min: 0, max: 100 }}
      >
        <View
          style={{
            width: `${Math.min(100, Math.max(0, row.share * 100))}%`,
            height: '100%',
            borderRadius: theme.radius.pill,
            backgroundColor: row.brandColor,
          }}
          testID={testID ? `${testID}-fill` : undefined}
        />
      </View>
    </View>
  );
}

function Meta({ children }: { children: string }): React.JSX.Element {
  const theme = useTheme();

  return (
    <AppText
      style={{
        ...theme.type.tag,
        color: theme.color.textSecondary,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </AppText>
  );
}
