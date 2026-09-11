import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen } from '../../src/ui/Screen';
import { Card } from '../../src/ui/Card';
import { DonutChart } from '../../src/ui/DonutChart';
import { theme } from '../../src/ui/theme';
import { useSubscriptions } from '../../src/store/subscriptions';
import { useFx } from '../../src/store/fx';
import { spendByCategory } from '../../src/domain/analytics';
import { formatMoney } from '../../src/domain/money';

export default function Analytics() {
  const items = useSubscriptions((s) => s.items);
  const cache = useFx((s) => s.cache);
  const slices = useMemo(() => spendByCategory(items, cache), [items, cache]);

  return (
    <Screen title="Аналитика" subtitle="Куда уходят деньги">
      {slices.length === 0 ? (
        <Text style={styles.dim}>Нет данных для графика.</Text>
      ) : (
        <Card>
          <View style={styles.center}>
            <DonutChart slices={slices} />
          </View>
          <View style={{ height: 16 }} />
          {slices.map((s) => (
            <View key={s.categoryId} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={styles.label}>{s.label}</Text>
              <Text style={styles.value}>
                {formatMoney(s.monthlyUsdMinor, 'USD')} · {Math.round(s.share * 100)}%
              </Text>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { color: theme.text, fontSize: 15, flex: 1 },
  value: { color: theme.textDim, fontSize: 14 },
  dim: { color: theme.textDim, fontSize: 15 },
});
