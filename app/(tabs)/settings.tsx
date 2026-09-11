import React from 'react';
import { View, Text, Share, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/ui/Screen';
import { Card } from '../../src/ui/Card';
import { Button } from '../../src/ui/Button';
import { theme } from '../../src/ui/theme';
import { useSubscriptions } from '../../src/store/subscriptions';
import { useFx } from '../../src/store/fx';
import { exportToJson } from '../../src/domain/analytics';
import { formatDate } from '../../src/domain/date';

export default function Settings() {
  const router = useRouter();
  const items = useSubscriptions((s) => s.items);
  const cache = useFx((s) => s.cache);
  const refresh = useFx((s) => s.refresh);

  return (
    <Screen title="Настройки">
      <Card>
        <Text style={styles.label}>Курс валют</Text>
        <Text style={styles.value}>
          {cache
            ? `обновлён ${formatDate(new Date(cache.providerUpdatedAt))}`
            : 'ещё не загружен'}
        </Text>
        <View style={{ height: 12 }} />
        <Button title="Обновить сейчас" onPress={() => void refresh(true)} />
      </Card>

      <View style={{ height: 16 }} />

      <Button title="Архив" onPress={() => router.push('/archive')} />
      <View style={{ height: 8 }} />
      <Button
        title="Экспорт в JSON"
        onPress={() => void Share.share({ message: exportToJson(items) })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: theme.textDim, fontSize: 13 },
  value: { color: theme.text, fontSize: 17, fontWeight: '600', marginTop: 4 },
});
