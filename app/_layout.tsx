import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFx } from '../src/store/fx';
import { useSubscriptions } from '../src/store/subscriptions';
import { syncReminders } from '../src/services/notifier';
import { theme } from '../src/ui/theme';

export default function RootLayout() {
  const refresh = useFx((s) => s.refresh);
  const items = useSubscriptions((s) => s.items);

  // Расписание пересобирается при каждом возвращении приложения на передний
  // план: даты списаний движутся, а фоновые задачи iOS не гарантирует.
  useEffect(() => {
    void refresh();
    void syncReminders(items);

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
        void syncReminders(useSubscriptions.getState().items);
      }
    });
    return () => subscription.remove();
  }, [refresh, items]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}
      />
    </SafeAreaProvider>
  );
}
