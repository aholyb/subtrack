import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { theme } from './theme';
import { Monogram } from './Monogram';
import { Subscription, CATEGORIES } from '../domain/subscription';
import { monthlyMinor, formatMoney } from '../domain/money';
import { nextBillingDate, daysUntilBilling } from '../domain/billing';
import { DateString } from '../domain/date';

type Props = { sub: Subscription; today: DateString; onPress: () => void };

export function SubscriptionCard({ sub, today, onPress }: Props) {
  const color = CATEGORIES.find((c) => c.id === sub.categoryId)?.color ?? theme.textDim;
  const next = nextBillingDate(sub.firstBillingDate, sub.cycle, today);
  const days = daysUntilBilling(sub.firstBillingDate, sub.cycle, today);
  const isTrial = sub.trialEndsAt !== null && sub.trialEndsAt >= today;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <Monogram name={sub.name} color={color} />
      <View style={styles.middle}>
        <Text style={styles.name}>{sub.name}</Text>
        <Text style={styles.meta}>
          {days === 0 ? 'списание сегодня' : `${next} · через ${days} дн.`}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>
          {formatMoney(monthlyMinor(sub.amountMinor, sub.cycle), sub.currency)} / мес
        </Text>
        {isTrial ? <Text style={styles.trial}>пробный период</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.card, borderColor: theme.border,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: theme.radius,
    padding: 12, marginBottom: 10,
  },
  middle: { flex: 1 },
  name: { color: theme.text, fontSize: 17, fontWeight: '600' },
  meta: { color: theme.textDim, fontSize: 13, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  price: { color: theme.text, fontSize: 15, fontWeight: '600' },
  trial: { color: theme.accent, fontSize: 12, marginTop: 2 },
});
