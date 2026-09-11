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
        tabBarLabelStyle: { fontSize: 11, paddingBottom: 2 },
        tabBarIconStyle: { marginTop: 2 },
        // Высота считается от безопасной зоны: на телефонах с индикатором
        // home таб-бар иначе обрезает подписи, а при нехватке высоты
        // react-navigation просто перестаёт их рисовать.
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          height: 64 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Подписки', tabBarIcon: icon('list') }} />
      <Tabs.Screen name="analytics" options={{ title: 'Аналитика', tabBarIcon: icon('chart') }} />
      <Tabs.Screen name="settings" options={{ title: 'Настройки', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
