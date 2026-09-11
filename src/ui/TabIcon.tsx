import React from 'react';
import { ColorValue } from 'react-native';
import Svg, { Rect, Circle, Line } from 'react-native-svg';

export type TabIconName = 'list' | 'chart' | 'settings';

type Props = { name: TabIconName; color: ColorValue; size?: number };

/**
 * Три иконки таб-бара, нарисованные примитивами react-native-svg. Отдельный
 * шрифтовой пакет ради трёх глифов не окупается: он весит больше, чем весь
 * этот файл, и тянет за собой загрузку шрифта.
 */
export function TabIcon({ name, color, size = 24 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'list' ? (
        <>
          <Rect x="3" y="5" width="18" height="4.5" rx="1.5" fill={color} />
          <Rect x="3" y="12" width="18" height="4.5" rx="1.5" fill={color} opacity={0.55} />
          <Rect x="3" y="19" width="11" height="2.5" rx="1.25" fill={color} opacity={0.3} />
        </>
      ) : null}

      {name === 'chart' ? (
        <>
          <Rect x="3" y="13" width="4.5" height="8" rx="1.5" fill={color} opacity={0.45} />
          <Rect x="9.75" y="8" width="4.5" height="13" rx="1.5" fill={color} />
          <Rect x="16.5" y="3" width="4.5" height="18" rx="1.5" fill={color} opacity={0.7} />
        </>
      ) : null}

      {name === 'settings' ? (
        <>
          <Line x1="3" y1="7" x2="21" y2="7" stroke={color} strokeWidth={2} strokeLinecap="round" />
          <Circle cx="15" cy="7" r="3" fill={color} />
          <Line x1="3" y1="17" x2="21" y2="17" stroke={color} strokeWidth={2} strokeLinecap="round" />
          <Circle cx="9" cy="17" r="3" fill={color} />
        </>
      ) : null}
    </Svg>
  );
}
