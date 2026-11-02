import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import Svg, {
  Circle, Line, Path, Rect, Text as SvgText,
} from 'react-native-svg';
import { formatShortDate } from '@/lib/i18n/format';
import {
  fonts, useTheme,
} from '@/theme';
import {
  chartGeometry, type ChartPoint,
} from '../chart-geometry';
import type { History } from '../hooks/use-measurements';
import { formatValue } from '../range';

const HEIGHT = 220;

const PADDING = {
  left: 44,
  right: 12,
  top: 12,
  bottom: 28,
};

export interface HistoryChartProps {
  history: History;
  label: string;
}

/**
 * The bucket averages as a line, the acceptable range as a shaded band behind it. A bucket is
 * marked in amber when any of its readings left the range, even if its average did not.
 */
export function HistoryChart ({ history, label }: HistoryChartProps): React.JSX.Element {
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const { minThreshold: min, maxThreshold: max, definition } = history;
  const points: ChartPoint[] = history.points.map((point) => ({
    time: Date.parse(point.bucketStart),
    value: point.avg,
    outOfRange: (min !== null && point.min < min) || (max !== null && point.max > max),
  }));
  const geometry = width === 0 ? null : chartGeometry({
    points,
    from: Date.parse(history.from),
    to: Date.parse(history.to),
    min,
    max,
    width,
    height: HEIGHT,
    padding: PADDING,
  });
  const label10 = {
    fontFamily: fonts.medium,
    fontSize: 11,
  };

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="image"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height: HEIGHT }}
      testID="history-chart"
    >
      {geometry ? (
        <Svg height={HEIGHT} width={width}>
          {geometry.band ? (
            <Rect
              fill={colors.mousseVeil}
              height={geometry.band.height}
              testID="history-band"
              width={geometry.plot.right - geometry.plot.left}
              x={geometry.plot.left}
              y={geometry.band.y}
            />
          ) : null}
          {geometry.ticks.map((tick) => (
            <Line
              key={`grid-${tick.value}`}
              stroke={colors.line}
              strokeWidth={1}
              x1={geometry.plot.left}
              x2={geometry.plot.right}
              y1={tick.y}
              y2={tick.y}
            />
          ))}
          {geometry.ticks.map((tick) => (
            <SvgText
              fill={colors.inkSoft}
              fontFamily={label10.fontFamily}
              fontSize={label10.fontSize}
              key={`tick-${tick.value}`}
              textAnchor="end"
              x={geometry.plot.left - 6}
              y={tick.y + 4}
            >
              {formatValue(tick.value, definition.decimals, i18n.language)}
            </SvgText>
          ))}
          {geometry.line !== '' ? (
            <Path d={geometry.line} fill="none" stroke={colors.lagon} strokeLinejoin="round" strokeWidth={2} />
          ) : null}
          {geometry.points.map((point) => (
            <Circle
              cx={point.x}
              cy={point.y}
              fill={point.outOfRange ? colors.ambre : colors.lagon}
              key={point.time}
              r={point.outOfRange ? 5 : 3.5}
              testID={point.outOfRange ? 'history-point-alert' : 'history-point'}
            />
          ))}
          <SvgText
            fill={colors.inkSoft}
            fontFamily={label10.fontFamily}
            fontSize={label10.fontSize}
            x={geometry.plot.left}
            y={HEIGHT - 8}
          >
            {formatShortDate(Date.parse(history.from), i18n.language)}
          </SvgText>
          <SvgText
            fill={colors.inkSoft}
            fontFamily={label10.fontFamily}
            fontSize={label10.fontSize}
            textAnchor="end"
            x={geometry.plot.right}
            y={HEIGHT - 8}
          >
            {formatShortDate(Date.parse(history.to), i18n.language)}
          </SvgText>
        </Svg>
      ) : null}
    </View>
  );
}
