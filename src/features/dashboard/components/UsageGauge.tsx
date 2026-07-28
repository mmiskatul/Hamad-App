import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/shared/theme';
import { AppText } from '@/shared/ui/AppText';

/*
 * Semi-circular meter (Figma 140:2165): a 120×72 arc with the percentage in
 * Manrope-ish 28pt over a 12pt caption, both sitting inside the arc's mouth.
 *
 * Drawn with react-native-svg (already a dependency for the auth backdrops)
 * rather than shipped as an exported asset, because the arc's LENGTH is the
 * data — an exported SVG would be frozen at the design's 85%.
 *
 * ONE path, twice: the track is the full semicircle, the value is the same path
 * clipped by `strokeDasharray`. Two arcs computed independently would be two
 * chances for the sweep and the label to disagree.
 *
 * COLOUR IS A JUDGEMENT CALL, flagged: the Figma arc is an exported vector whose
 * fills the MCP response does not expose, and in the render both halves read as
 * near-identical greys — almost certainly placeholder. The filled portion uses
 * the brand accent here, which is what "emphasis" means everywhere else in this
 * app; swap it if the designer confirms otherwise.
 */
const WIDTH = 120;
const HEIGHT = 72;
const STROKE = 12;
const RADIUS = (WIDTH - STROKE) / 2;
const CENTER_Y = HEIGHT - STROKE / 2;
/* Half a circumference — the dash budget for a 180° sweep. */
const ARC_LENGTH = Math.PI * RADIUS;
const ARC_PATH = `M ${STROKE / 2} ${CENTER_Y} A ${RADIUS} ${RADIUS} 0 0 1 ${
  WIDTH - STROKE / 2
} ${CENTER_Y}`;

export type UsageGaugeProps = {
  /** 0..1. Clamped by the caller (see usageRatio). */
  ratio: number;
  /** Big figure inside the arc, e.g. "85%". */
  value: string;
  /** Caption under it, e.g. "25 / 50 Req". */
  caption: string;
  testID?: string;
};

export default function UsageGauge({
  ratio,
  value,
  caption,
  testID,
}: UsageGaugeProps): React.JSX.Element {
  const theme = useTheme();

  const filled = Math.min(1, Math.max(0, ratio)) * ARC_LENGTH;

  return (
    <View style={{ alignItems: 'center', gap: 6 }} testID={testID}>
      <View style={{ width: WIDTH, height: HEIGHT }}>
        <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
          <Path
            d={ARC_PATH}
            stroke={theme.color.muted}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d={ARC_PATH}
            stroke={theme.color.accent}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${filled} ${ARC_LENGTH}`}
          />
        </Svg>
      </View>

      <View style={{ alignItems: 'center', gap: 6, marginTop: -22 }}>
        <AppText
          style={{ fontSize: 28, lineHeight: 28, fontWeight: '600', color: theme.color.textPrimary }}
          testID={testID ? `${testID}-value` : undefined}
        >
          {value}
        </AppText>
        <AppText
          style={{ fontSize: 12, lineHeight: 16, color: theme.color.textSecondary, textAlign: 'center' }}
        >
          {caption}
        </AppText>
      </View>
    </View>
  );
}
