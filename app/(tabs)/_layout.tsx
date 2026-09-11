import React from 'react';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ColorValue } from 'react-native';
import { theme } from '../../src/ui/theme';
import { TabIcon, TabIconName } from '../../src/ui/TabIcon';

const icon = (name: TabIconName) =>
  function TabBarIcon({ color }: { color: ColorValue }) {
    return <TabIcon name={name} color={color} />;
  };

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textDim,
        tabBarLabelPosition: 'below-icon',
        /*
         * Подпись обрезалась не безопасной зоной, а флексбоксом внутри кнопки.
         * Кнопка вкладки — это колонка с padding 5px, иконка в ней стоит
         * flex: 0 0 auto и сжиматься не умеет, а подпись — flex: 0 1 auto и
         * умеет. Когда высоты не хватало, флексбокс молча ужимал коробку
         * текста до 7 пикселей при overflow: hidden вместо того, чтобы
         * переполниться, и от букв оставалась верхняя половина.
         *
         * Поэтому здесь два условия сразу: flexShrink: 0 запрещает ужимать
         * подпись, а высота бара даёт ей место. Минимум считается так:
         * иконка 24 + строка 16 + padding кнопки 10 + padding бара 8 = 58.
         */
        tabBarLabelStyle: { fontSize: 11, lineHeight: 16, flexShrink: 0 },
        tabBarIconStyle: { marginTop: 0 },
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          height: 60 + insets.bottom,
          paddingTop: 4,
          paddingBottom: insets.bottom + 4,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Подписки', tabBarIcon: icon('list') }} />
      <Tabs.Screen name="analytics" options={{ title: 'Аналитика', tabBarIcon: icon('chart') }} />
      <Tabs.Screen name="settings" options={{ title: 'Настройки', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
