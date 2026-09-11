import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/ui/Screen';
import { Card } from '../../src/ui/Card';
import { Button } from '../../src/ui/Button';
import { theme } from '../../src/ui/theme';
import { useSubscriptions } from '../../src/store/subscriptions';
import { formatMoney, monthlyMinor, yearlyMinor } from '../../src/domain/money';
import { nextBillingDate } from '../../src/domain/billing';
import { todayString } from '../../src/domain/date';
import { resolveCancelRoute } from '../../src/domain/cancelRoute';
import { openCancelRoute } from '../../src/services/cancel';

const PAYMENT_LABELS: Record<string, string> = {
  appstore: 'App Store',
  card: 'Карта',
  paypal: 'PayPal',
  other: 'Другое',
};

export default function Detail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sub = useSubscriptions((s) => s.items.find((x) => x.id === id));
  const cancel = useSubscriptions((s) => s.cancel);
  const [asking, setAsking] = useState(false);

  if (!sub) {
    return (
      <Screen title="Подписка">
        <Text style={styles.dim}>Подписка не найдена.</Text>
      </Screen>
    );
  }

  const today = todayString();
  const next = nextBillingDate(sub.firstBillingDate, sub.cycle, today);

  const startCancel = async () => {
    await openCancelRoute(resolveCancelRoute(sub));
    // Статус меняем только по ответу пользователя: факт открытия страницы
    // ничего не доказывает — сервисы уводят в многошаговые retention-воронки.
    setAsking(true);
  };

  return (
    <Screen title={sub.name}>
      <Card>
        <Text style={styles.price}>
          {formatMoney(monthlyMinor(sub.amountMinor, sub.cycle), sub.currency)} / мес
        </Text>
        <Text style={styles.dim}>
          ({formatMoney(yearlyMinor(sub.amountMinor, sub.cycle), sub.currency)} / год)
        </Text>
        <View style={{ height: 12 }} />
        <Text style={styles.dim}>Следующее списание: {next}</Text>
        <Text style={styles.dim}>Оплата: {PAYMENT_LABELS[sub.paymentMethod]}</Text>
        {sub.trialEndsAt ? (
          <Text style={styles.trial}>Пробный период до {sub.trialEndsAt}</Text>
        ) : null}
      </Card>

      <View style={{ height: 16 }} />

      {asking ? (
        <Card>
          <Text style={styles.ask}>Отмена прошла?</Text>
          <Text style={styles.dim}>
            Приложение не может это проверить само — подтверди, если дошёл до конца.
          </Text>
          <View style={{ height: 12 }} />
          <Button
            title="Да, отменил"
            variant="primary"
            onPress={() => {
              cancel(sub.id, today);
              setAsking(false);
              router.back();
            }}
          />
          <View style={{ height: 8 }} />
          <Button title="Ещё нет" onPress={() => setAsking(false)} />
        </Card>
      ) : (
        <Button title="Отменить подписку" variant="danger" onPress={startCancel} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  price: { color: theme.text, fontSize: 32, fontWeight: '800' },
  dim: { color: theme.textDim, fontSize: 15, marginTop: 2 },
  trial: { color: theme.accent, fontSize: 14, marginTop: 8 },
  ask: { color: theme.text, fontSize: 18, fontWeight: '700' },
});
