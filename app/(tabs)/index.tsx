import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/ui/Screen';
import { Button } from '../../src/ui/Button';
import { SummaryHeader } from '../../src/ui/SummaryHeader';
import { SubscriptionCard } from '../../src/ui/SubscriptionCard';
import { FxBanner } from '../../src/ui/FxBanner';
import { theme } from '../../src/ui/theme';
import { useSubscriptions } from '../../src/store/subscriptions';
import { useFx } from '../../src/store/fx';
import { computeTotals, sortByNextBilling } from '../../src/domain/subscriptionOps';
import { daysUntilBilling } from '../../src/domain/billing';
import { todayString, formatDate } from '../../src/domain/date';
import { fxFreshness } from '../../src/domain/fx';

export default function Home() {
  const router = useRouter();
  const items = useSubscriptions((s) => s.items);
  const cache = useFx((s) => s.cache);
  const today = todayString();

  const active = useMemo(
    () => sortByNextBilling(items.filter((s) => s.status === 'active'), today),
    [items, today],
  );
  const totals = useMemo(() => computeTotals(items, cache), [items, cache]);
  const freshness = fxFreshness(cache, Date.now());
  const cacheDate = cache ? formatDate(new Date(cache.providerUpdatedAt)) : null;

  // Список делится, а не дублируется: одна и та же карточка в двух секциях
  // читается как ошибка отрисовки.
  const soon = active.filter((s) => daysUntilBilling(s.firstBillingDate, s.cycle, today) <= 7);
  const rest = active.filter((s) => daysUntilBilling(s.firstBillingDate, s.cycle, today) > 7);

  return (
    <Screen title="Подписки" subtitle="Что списывается и когда">
      <SummaryHeader totals={totals} freshness={freshness} cacheDate={cacheDate} />
      <View style={{ height: 20 }} />
      <FxBanner count={totals.unconvertible.length} />

      {active.length === 0 ? (
        <Text style={styles.empty}>Пока пусто. Добавь первую подписку.</Text>
      ) : (
        <>
          {soon.length > 0 ? <Text style={styles.section}>Скоро спишут</Text> : null}
          {soon.map((s) => (
            <SubscriptionCard
              key={s.id} sub={s} today={today}
              onPress={() => router.push(`/subscription/${s.id}`)}
            />
          ))}

          {rest.length > 0 ? <Text style={styles.section}>Дальше</Text> : null}
          {rest.map((s) => (
            <SubscriptionCard
              key={s.id} sub={s} today={today}
              onPress={() => router.push(`/subscription/${s.id}`)}
            />
          ))}
        </>
      )}

      <View style={{ height: 12 }} />
      <Button title="Добавить подписку" variant="primary" onPress={() => router.push('/add')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { color: theme.textDim, fontSize: 16, paddingVertical: 32, textAlign: 'center' },
  section: {
    color: theme.textDim, fontSize: 13, textTransform: 'uppercase',
    marginTop: 16, marginBottom: 8,
  },
});
