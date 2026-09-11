import React, { useMemo } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Screen } from '../src/ui/Screen';
import { Card } from '../src/ui/Card';
import { Button } from '../src/ui/Button';
import { theme } from '../src/ui/theme';
import { useSubscriptions } from '../src/store/subscriptions';
import { useFx } from '../src/store/fx';
import { formatMoney, yearlyMinor } from '../src/domain/money';
import { toUsdMinor } from '../src/domain/fx';

export default function Archive() {
  // Селектор возвращает сам массив из стора: фильтрация внутри селектора
  // создаёт новую ссылку на каждый вызов, и useSyncExternalStore уходит
  // в бесконечный цикл рендера.
  const all = useSubscriptions((s) => s.items);
  const restore = useSubscriptions((s) => s.restore);
  const cache = useFx((s) => s.cache);

  const items = useMemo(() => all.filter((x) => x.status === 'canceled'), [all]);

  // Описывает текущее положение дел, а не «сэкономлено за всё время»:
  // накопительную экономию честно не посчитать, не зная, сколько бы человек
  // ещё платил.
  const notPaying = items.reduce((sum, s) => {
    const usd = toUsdMinor(s.amountMinor, s.currency, cache);
    return usd === null ? sum : sum + yearlyMinor(usd, s.cycle);
  }, 0);

  return (
    <Screen title="Архив" subtitle="Отменённые подписки">
      {items.length === 0 ? (
        <Text style={styles.dim}>Архив пуст.</Text>
      ) : (
        <>
          <Card>
            <Text style={styles.saved}>Не платишь {formatMoney(notPaying, 'USD')} в год</Text>
          </Card>
          <View style={{ height: 16 }} />
          {items.map((s) => (
            <Card key={s.id} style={{ marginBottom: 10 }}>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.dim}>Отменена {s.canceledAt}</Text>
              <View style={{ height: 10 }} />
              <Button title="Вернуть в активные" onPress={() => restore(s.id)} />
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  saved: { color: theme.text, fontSize: 20, fontWeight: '700' },
  name: { color: theme.text, fontSize: 17, fontWeight: '600' },
  dim: { color: theme.textDim, fontSize: 14, marginTop: 2 },
});
