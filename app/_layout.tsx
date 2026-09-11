import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFx } from '../src/store/fx';
import { theme } from '../src/ui/theme';

export default function RootLayout() {
  const refresh = useFx((s) => s.refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      />
    </SafeAreaProvider>
  );
}
