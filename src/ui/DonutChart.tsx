import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { CategorySlice } from '../domain/analytics';
import { theme } from './theme';

const SIZE = 180;
const STROKE = 28;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({ slices }: { slices: CategorySlice[] }) {
  let offset = 0;

  return (
    <View testID="donut">
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
          stroke={theme.border} strokeWidth={STROKE} fill="none"
        />
        {slices.map((slice) => {
          const length = slice.share * CIRCUMFERENCE;
          const circle = (
            <Circle
              key={slice.categoryId}
              cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
              stroke={slice.color} strokeWidth={STROKE} fill="none"
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={-offset}
              rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}
            />
          );
          offset += length;
          return circle;
        })}
      </Svg>
    </View>
  );
}
